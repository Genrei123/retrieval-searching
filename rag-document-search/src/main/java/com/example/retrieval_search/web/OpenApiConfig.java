package com.example.retrieval_search.web;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI retrievalSearchOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Retrieval Search API")
                        .description("Ingest, search, and manage documents for retrieval.")
                        .version("v1"));
    }
}
