package com.example.retrieval_search.web;

import com.example.retrieval_search.generation.GenerationService;
import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.web.dto.SearchResultDto;
import com.example.retrieval_search.web.dto.TopicResponseDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Topics", description = "Retrieval-augmented topic explanations over ingested documents")
public class TopicController {

    private final GenerationService generationService;

    public TopicController(GenerationService generationService) {
        this.generationService = generationService;
    }

    @Operation(summary = "Explain a topic using retrieved sections as context",
            description = "Retrieves the most relevant sections for the given topic, then asks the LLM to synthesize an explanation from them.")
    @GetMapping("/topics")
    public TopicResponseDto explain(
            @RequestParam("topic") String topic,
            @RequestParam(value = "topK", defaultValue = "5") int topK,
            @RequestParam(value = "documentId", required = false) UUID documentId) {

        int cappedTopK = Math.min(Math.max(topK, 1), 10);
        long startNanos = System.nanoTime();

        GenerationService.RagOutcome outcome = generationService.explainTopic(topic, cappedTopK, documentId);
        long tookMs = (System.nanoTime() - startNanos) / 1_000_000;

        List<SearchResultDto> sources = outcome.sources().stream().map(this::toDto).toList();
        return new TopicResponseDto(outcome.query(), outcome.text(), tookMs, sources);
    }

    private SearchResultDto toDto(SearchHit hit) {
        return new SearchResultDto(
                hit.sectionId(), hit.documentId(), hit.documentTitle(), hit.headingPath(),
                hit.anchor(), hit.snippet(), hit.score(), hit.matchType());
    }
}
