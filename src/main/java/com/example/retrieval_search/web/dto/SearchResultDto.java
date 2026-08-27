package com.example.retrieval_search.web.dto;

import com.example.retrieval_search.domain.MatchType;

import java.util.UUID;

public record SearchResultDto(
        UUID sectionId,
        UUID documentId,
        String documentTitle,
        String headingPath,
        String anchor,
        String snippet,
        double score,
        MatchType matchType
) {
}
