package com.example.retrieval_search.generation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;
import static org.assertj.core.api.Assertions.*;

class OpenAiClientTest {
    private HttpServer server;
    private OpenAiClient client;
    private String baseUrl;
    private final AtomicReference<String> auth = new AtomicReference<>();
    private final AtomicReference<JsonNode> request = new AtomicReference<>();
    private static final String COMPLETED = "data: {\"type\":\"response.completed\",\"response\":{\"status\":\"completed\"}}\n\n";

    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort() + "/v1";
        client = new OpenAiClient(baseUrl, "test-key", "test-model", "low", 2048, Duration.ofSeconds(5));
    }

    @AfterEach void stop() { client.close(); server.stop(0); }

    private void respond(int status, String body) {
        server.createContext("/v1/responses", exchange -> {
            auth.set(exchange.getRequestHeaders().getFirst("Authorization"));
            request.set(new ObjectMapper().readTree(exchange.getRequestBody()));
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", body.startsWith("data:") ? "text/event-stream" : "application/json");
            exchange.sendResponseHeaders(status, bytes.length);
            try (var output = exchange.getResponseBody()) { output.write(bytes); }
        });
    }

    @Test void sendsAuthModelAndDisabledStorageAndReadsAllTextItems() {
        respond(200, """
                {"status":"completed","output":[{"type":"reasoning","summary":[]},
                  {"type":"message","content":[{"type":"output_text","text":"Answer"},
                   {"type":"output_text","text":" [1]"}]}]}
                """);
        assertThat(client.generate("Question and context")).isEqualTo("Answer [1]");
        assertThat(auth.get()).isEqualTo("Bearer test-key");
        assertThat(request.get().path("model").asText()).isEqualTo("test-model");
        assertThat(request.get().path("input").asText()).isEqualTo("Question and context");
        assertThat(request.get().path("store").asBoolean(true)).isFalse();
        assertThat(request.get().path("stream").asBoolean(true)).isFalse();
        assertThat(request.get().path("max_output_tokens").asInt()).isEqualTo(2048);
        assertThat(request.get().path("reasoning").path("effort").asText()).isEqualTo("low");
    }

    @Test void streamsOnlyTextAndPreservesWhitespaceAcrossEvents() {
        respond(200, "data: {\"type\":\"response.created\"}\n\n"
                + "event: response.output_text.delta\ndata: {\"type\":\"response.output_text.delta\",\"delta\":\"Cache\"}\n\n"
                + ": keepalive\n\ndata: {\"type\":\"response.output_text.delta\",\n"
                + "data: \"delta\":\" data. [1]\"}\n\n" + COMPLETED);
        var text = new StringBuilder();
        client.generateStream("Prompt", text::append);
        assertThat(text.toString()).isEqualTo("Cache data. [1]");
        assertThat(request.get().path("stream").asBoolean()).isTrue();
    }

    @Test void incompleteStreamCannotBecomeCachedSuccess() {
        respond(200, "data: {\"type\":\"response.output_text.delta\",\"delta\":\"Partial\"}\n\ndata: [DONE]\n\n");
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {})).isInstanceOf(GenerationException.class);
    }

    @Test void completedButEmptyStreamFails() {
        respond(200, COMPLETED);
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {})).isInstanceOf(GenerationException.class);
    }

    @Test void incompleteResponseEventFails() {
        respond(200, "data: {\"type\":\"response.incomplete\"}\n\n");
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {})).isInstanceOf(GenerationException.class);
    }

    @Test void providerErrorDoesNotLeakProviderBody() {
        respond(200, "data: {\"type\":\"error\",\"message\":\"secret-from-provider\"}\n\n");
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {}))
                .isInstanceOf(GenerationException.class).hasMessageNotContaining("secret-from-provider");
    }

    @Test void authenticationFailureIsActionableAndSanitized() {
        respond(401, "{\"error\":{\"message\":\"secret-from-provider\"}}");
        assertThatThrownBy(() -> client.generate("Prompt")).hasMessageContaining("OPENAI_API_KEY")
                .hasMessageNotContaining("secret-from-provider");
    }

    @Test void rateLimitIsActionableForStreams() {
        respond(429, "quota exceeded");
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {})).hasMessageContaining("billing and limits");
    }

    @Test void incompleteJsonAnswerFails() {
        respond(200, "{\"status\":\"incomplete\",\"output\":[]}");
        assertThatThrownBy(() -> client.generate("Prompt")).isInstanceOf(GenerationException.class);
    }

    @Test void blankKeyFailsBeforeAnyNetworkRequest() {
        client.close();
        client = new OpenAiClient(baseUrl, " ", "test-model", "low", 2048, Duration.ofSeconds(5));
        assertThatThrownBy(() -> client.generate("Prompt")).hasMessageContaining("OPENAI_API_KEY");
        assertThatThrownBy(() -> client.generateStream("Prompt", ignored -> {})).hasMessageContaining("OPENAI_API_KEY");
        assertThat(request.get()).isNull();
    }

    @Test void optionalReasoningCanBeOmittedForOtherModels() {
        client.close();
        client = new OpenAiClient(baseUrl, "test-key", "other-model", "", 2048, Duration.ofSeconds(5));
        respond(200, "{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\",\"refusal\":\"Cannot answer.\"}]}]}");
        assertThat(client.generate("Prompt")).isEqualTo("Cannot answer.");
        assertThat(request.get().has("reasoning")).isFalse();
    }
}
