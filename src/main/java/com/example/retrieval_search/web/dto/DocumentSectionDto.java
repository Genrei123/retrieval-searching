package com.example.retrieval_search.web.dto;

import java.util.UUID;

public record DocumentSectionDto(
        UUID id,
        int ordinal,
        String headingPath,
        String anchor,
        String body
) {
}
