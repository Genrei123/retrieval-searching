package com.example.retrieval_search.domain;

import java.util.UUID;

public record DocumentSection(
        UUID id,
        UUID documentId,
        int ordinal,
        String headingPath,
        String body,
        String anchor
) {
}
