package com.example.retrieval_search.web.dto;

import java.util.List;

public record TopicResponseDto(
        String topic,
        String explanation,
        long tookMs,
        List<SearchResultDto> sources
) {
}
