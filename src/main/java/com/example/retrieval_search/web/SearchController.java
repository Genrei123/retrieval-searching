package com.example.retrieval_search.web;

import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.search.SearchService;
import com.example.retrieval_search.web.dto.SearchResponseDto;
import com.example.retrieval_search.web.dto.SearchResultDto;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @GetMapping("/search")
    public SearchResponseDto search(
            @RequestParam("q") String q,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "documentId", required = false) UUID documentId) {

        int cappedSize = Math.min(Math.max(size, 1), 50);
        int safePage = Math.max(page, 0);

        SearchService.SearchOutcome outcome = searchService.search(q, safePage, cappedSize, documentId);

        List<SearchResultDto> results = outcome.hits().stream()
                .map(this::toDto)
                .toList();

        return new SearchResponseDto(
                outcome.query(), outcome.totalResults(), outcome.page(), outcome.size(), outcome.tookMs(), results);
    }

    private SearchResultDto toDto(SearchHit hit) {
        return new SearchResultDto(
                hit.sectionId(), hit.documentId(), hit.documentTitle(), hit.headingPath(),
                hit.anchor(), hit.snippet(), hit.score(), hit.matchType());
    }
}
