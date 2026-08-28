package com.example.retrieval_search.generation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Thin wrapper over Ollama's native /api/generate endpoint (non-streaming). */
@Component
public class OllamaClient {

    private final RestClient restClient;
    private final String model;

    public OllamaClient(RestClient.Builder builder,
                         @Value("${ollama.base-url}") String baseUrl,
                         @Value("${ollama.model}") String model) {
        this.restClient = builder.baseUrl(baseUrl).build();
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

    private record GenerateRequest(String model, String prompt, boolean stream) {
    }

    private record GenerateResponse(String response) {
    }
}
