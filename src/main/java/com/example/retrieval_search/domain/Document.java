package com.example.retrieval_search.domain;

import java.time.Instant;
import java.util.UUID;

public record Document(
        UUID id,
        String title,
        String sourceUri,
        String contentType,
        String version,
        Instant ingestedAt,
        String checksum
) {
}
