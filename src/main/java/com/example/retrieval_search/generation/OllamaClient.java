package com.example.retrieval_search.generation;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.function.Consumer;

/** Thin wrapper over Ollama's native /api/generate endpoint. */
@Component
public class OllamaClient {

    private final RestClient restClient;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String baseUrl;
    private final String model;

    public OllamaClient(@Value("${ollama.base-url}") String baseUrl,
                         @Value("${ollama.model}") String model) {
        this.restClient = RestClient.create(baseUrl);
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.objectMapper = new ObjectMapper()
                .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        this.baseUrl = baseUrl;
        this.model = model;
    }

    public String generate(String prompt) {
        GenerateResponse response = restClient.post()
                .uri("/api/generate")
                .body(new GenerateRequest(model, prompt, false))
                .retrieve()
                .body(GenerateResponse.class);
        return response != null && response.response() != null ? response.response().trim() : "";
    }

    /** Streams tokens as they arrive from Ollama's newline-delimited JSON response, invoking
     * {@code onToken} for each chunk of generated text as soon as it is received. */
    public void generateStream(String prompt, Consumer<String> onToken) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/api/generate"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(
                            objectMapper.writeValueAsBytes(new GenerateRequest(model, prompt, true))))
                    .build();

            HttpResponse<java.io.InputStream> response =
                    httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(response.body(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    if (line.isBlank()) {
                        continue;
                    }
                    StreamChunk chunk = objectMapper.readValue(line, StreamChunk.class);
                    if (chunk.response() != null && !chunk.response().isEmpty()) {
                        onToken.accept(chunk.response());
                    }
                    if (chunk.done()) {
                        break;
                    }
                }
            }
        } catch (IOException | InterruptedException e) {
            if (e instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new RuntimeException("Ollama streaming request failed", e);
        }
    }

    private record GenerateRequest(String model, String prompt, boolean stream) {
    }

    private record GenerateResponse(String response) {
    }

    private record StreamChunk(String response, boolean done) {
    }
}
