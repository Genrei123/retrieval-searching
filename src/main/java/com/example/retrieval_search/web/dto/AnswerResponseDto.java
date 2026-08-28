package com.example.retrieval_search.web.dto;

import java.util.List;

public record AnswerResponseDto(
        String query,
        String answer,
        long tookMs,
        List<SearchResultDto> sources
) {
}
