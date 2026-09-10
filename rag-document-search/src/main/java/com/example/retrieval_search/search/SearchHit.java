package com.example.retrieval_search.search;

import com.example.retrieval_search.domain.MatchType;

import java.util.UUID;

public record SearchHit(
        UUID sectionId,
        UUID documentId,
        String documentTitle,
        String headingPath,
        String anchor,
        String snippet,
        double score,
        MatchType matchType,
        long totalCount
) {
}
