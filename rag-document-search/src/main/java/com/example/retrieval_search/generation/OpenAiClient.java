package com.example.retrieval_search.generation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.function.Consumer;

/** OpenAI Responses API transport. The API key never leaves backend configuration. */
@Component
public class OpenAiClient implements AutoCloseable {
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final ObjectMapper json = new ObjectMapper();
    private final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor(
            Thread.ofPlatform().daemon().name("openai-stream-timeout").factory());
    private final URI endpoint;
    private final String apiKey;
    private final String model;
    private final String reasoningEffort;
    private final int maxOutputTokens;
    private final Duration timeout;

    public OpenAiClient(@Value("${openai.base-url}") String baseUrl,
                        @Value("${openai.api-key:}") String apiKey,
                        @Value("${openai.model}") String model,
                        @Value("${openai.reasoning-effort:low}") String reasoningEffort,
                        @Value("${openai.max-output-tokens:2048}") int maxOutputTokens,
                        @Value("${openai.timeout:PT2M}") Duration timeout) {
        this.endpoint = URI.create(baseUrl.replaceAll("/+$", "") + "/responses");
        this.apiKey = apiKey.trim();
        this.model = model;
        this.reasoningEffort = reasoningEffort;
        this.maxOutputTokens = maxOutputTokens;
        this.timeout = timeout;
        if (maxOutputTokens < 1 || timeout.isZero() || timeout.isNegative())
            throw new IllegalArgumentException("OpenAI token limit and timeout must be positive");
    }

    private HttpRequest request(String prompt, boolean stream) throws IOException {
        if (apiKey.isBlank()) throw new GenerationException(
                "Set OPENAI_API_KEY in the backend environment, then restart the backend to enable answers.");
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", model);
        body.put("input", prompt);
        body.put("stream", stream);
        body.put("store", false);
        body.put("max_output_tokens", maxOutputTokens);
        if (!reasoningEffort.isBlank()) body.put("reasoning", Map.of("effort", reasoningEffort));
        return HttpRequest.newBuilder(endpoint).timeout(timeout)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .header("Accept", stream ? "text/event-stream" : "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(json.writeValueAsBytes(body))).build();
    }

    public String generate(String prompt) {
        try {
            var response = http.send(request(prompt, false), HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            checkStatus(response.statusCode());
            JsonNode result = json.readTree(response.body());
            requireCompleted(result);
            StringBuilder text = new StringBuilder();
            for (JsonNode item : result.path("output")) {
                if (!"message".equals(item.path("type").asText())) continue;
                for (JsonNode content : item.path("content")) {
                    switch (content.path("type").asText()) {
                        case "output_text" -> text.append(content.path("text").asText(""));
                        case "refusal" -> text.append(content.path("refusal").asText(""));
                        default -> { }
                    }
                }
            }
            if (text.toString().isBlank()) throw new GenerationException("OpenAI returned an empty answer. Please retry.");
            return text.toString();
        } catch (IOException e) {
            throw new GenerationException("Could not complete the OpenAI request. Check connectivity and retry.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GenerationException("OpenAI request was interrupted. Please retry.");
        }
    }

    public void generateStream(String prompt, Consumer<String> onToken) {
        try {
            var response = http.send(request(prompt, true), HttpResponse.BodyHandlers.ofInputStream());
            try (var body = response.body()) {
                checkStatus(response.statusCode());
                // HttpRequest.timeout alone does not bound consumption of an InputStream body.
                var deadline = deadlines.schedule(() -> {
                    try { body.close(); } catch (IOException ignored) { }
                }, timeout.toMillis(), TimeUnit.MILLISECONDS);
                try (var reader = new BufferedReader(new InputStreamReader(body, StandardCharsets.UTF_8))) {
                    var state = new StreamState(onToken);
                    StringBuilder data = new StringBuilder();
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.isEmpty()) {
                            if (!data.isEmpty()) { state.accept(data.toString()); data.setLength(0); }
                            if (state.completed) break;
                        } else if (line.startsWith("data:")) {
                            String value = line.substring(5);
                            if (value.startsWith(" ")) value = value.substring(1);
                            if (!data.isEmpty()) data.append('\n');
                            data.append(value);
                        }
                    }
                    if (!state.completed && !data.isEmpty()) state.accept(data.toString());
                    if (!state.completed || !state.hasText) throw new GenerationException(
                            "OpenAI stream ended without a complete answer. Please retry.");
                } finally { deadline.cancel(false); }
            }
        } catch (IOException e) {
            throw new GenerationException("OpenAI stream was interrupted or timed out. Please retry.");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new GenerationException("OpenAI request was interrupted. Please retry.");
        }
    }

    private class StreamState {
        private final Consumer<String> onToken;
        private boolean completed;
        private boolean hasText;
        StreamState(Consumer<String> onToken) { this.onToken = onToken; }
        void accept(String data) throws IOException {
            if ("[DONE]".equals(data)) return; // A sentinel alone does not prove successful completion.
            JsonNode event = json.readTree(data);
            switch (event.path("type").asText()) {
                case "response.output_text.delta", "response.refusal.delta" -> {
                    String delta = event.path("delta").asText("");
                    hasText |= !delta.isBlank();
                    if (!delta.isEmpty()) onToken.accept(delta);
                }
                case "response.completed" -> { requireCompleted(event.path("response")); completed = true; }
                case "response.failed", "response.incomplete", "error" -> throw new GenerationException(
                        "OpenAI could not complete the answer. Retry, or check the model and output-token limit.");
                default -> { } // Ignore lifecycle, reasoning, and annotation events.
            }
        }
    }

    private void requireCompleted(JsonNode response) {
        if (response == null || !"completed".equals(response.path("status").asText()))
            throw new GenerationException("OpenAI could not complete the answer. Retry, or increase OPENAI_MAX_OUTPUT_TOKENS.");
    }

    private void checkStatus(int status) {
        if (status >= 200 && status < 300) return;
        String message = switch (status) {
            case 401 -> "OpenAI rejected the API key. Check OPENAI_API_KEY and restart the backend.";
            case 403, 404 -> "The configured OpenAI model is unavailable to this API key. Check OPENAI_MODEL and project access.";
            case 429 -> "OpenAI rate limit or API quota reached. Check API billing and limits, then retry.";
            case 400 -> "OpenAI rejected the request settings. Check OPENAI_MODEL, reasoning effort, and output-token limit.";
            default -> "OpenAI is unavailable (HTTP " + status + "). Please retry.";
        };
        throw new GenerationException(message);
    }

    @Override @PreDestroy public void close() {
        deadlines.shutdownNow();
        http.shutdownNow();
    }
}
