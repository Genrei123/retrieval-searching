package com.example.retrieval_search.web.dto;

import java.util.List;

public record SearchResponseDto(
        String query,
        long totalResults,
        int page,
        int size,
        long tookMs,
        List<SearchResultDto> results
) {
}
