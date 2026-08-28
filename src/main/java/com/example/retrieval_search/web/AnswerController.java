package com.example.retrieval_search.web;

import com.example.retrieval_search.generation.GenerationService;
import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.web.dto.AnswerResponseDto;
import com.example.retrieval_search.web.dto.SearchResultDto;
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
@Tag(name = "Answer", description = "Retrieval-augmented generation over ingested documents")
public class AnswerController {

    private final GenerationService generationService;

    public AnswerController(GenerationService generationService) {
        this.generationService = generationService;
    }

    @Operation(summary = "Answer a question using retrieved sections as context",
            description = "Runs the same retrieval as /search, then feeds the top sections to the LLM to generate an answer.")
    @GetMapping("/answer")
    public AnswerResponseDto answer(
            @RequestParam("q") String q,
            @RequestParam(value = "topK", defaultValue = "5") int topK,
            @RequestParam(value = "documentId", required = false) UUID documentId) {

        int cappedTopK = Math.min(Math.max(topK, 1), 10);
        long startNanos = System.nanoTime();

        GenerationService.RagOutcome outcome = generationService.answerQuestion(q, cappedTopK, documentId);
        long tookMs = (System.nanoTime() - startNanos) / 1_000_000;

        List<SearchResultDto> sources = outcome.sources().stream().map(this::toDto).toList();
        return new AnswerResponseDto(outcome.query(), outcome.text(), tookMs, sources);
    }

    private SearchResultDto toDto(SearchHit hit) {
        return new SearchResultDto(
                hit.sectionId(), hit.documentId(), hit.documentTitle(), hit.headingPath(),
                hit.anchor(), hit.snippet(), hit.score(), hit.matchType());
    }
}
