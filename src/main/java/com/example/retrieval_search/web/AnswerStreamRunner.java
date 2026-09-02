package com.example.retrieval_search.web;

import com.example.retrieval_search.generation.GenerationService;
import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.web.dto.SearchResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/** Separate bean from the controller so the @Async entry point is proxied (same reasoning as
 * AsyncIngestionRunner): the blocking retrieve-then-stream call must not run on the request
 * thread, or the SseEmitter would never be returned to the client until generation finished. */
@Component
public class AnswerStreamRunner {

    private static final Logger log = LoggerFactory.getLogger(AnswerStreamRunner.class);

    private final GenerationService generationService;

    public AnswerStreamRunner(GenerationService generationService) {
        this.generationService = generationService;
    }

    @Async
    public void stream(SseEmitter emitter, String question, int topK, UUID documentId) {
        try {
            generationService.streamAnswer(question, topK, documentId,
                    sources -> send(emitter, "sources", toDtos(sources), MediaType.APPLICATION_JSON),
                    token -> send(emitter, "token", token, MediaType.APPLICATION_JSON));
            send(emitter, "done", "", MediaType.TEXT_PLAIN);
            emitter.complete();
        } catch (Exception e) {
            log.warn("Answer stream failed", e);
            emitter.completeWithError(e);
        }
    }

    private List<SearchResultDto> toDtos(List<SearchHit> hits) {
        return hits.stream()
                .map(hit -> new SearchResultDto(
                        hit.sectionId(), hit.documentId(), hit.documentTitle(), hit.headingPath(),
                        hit.anchor(), hit.snippet(), hit.score(), hit.matchType()))
                .toList();
    }

    /** Always serializes as JSON (even a plain token string), never as raw text: a raw string
     * data line starting with a space would have that leading space silently stripped by the
     * browser's EventSource parser (one leading space after "data:" is spec-mandated to be
     * trimmed), which is exactly where word-initial spaces from the LLM's token stream live. */
    private void send(SseEmitter emitter, String eventName, Object data, MediaType mediaType) {
        try {
            emitter.send(SseEmitter.event().name(eventName).data(data, mediaType));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
