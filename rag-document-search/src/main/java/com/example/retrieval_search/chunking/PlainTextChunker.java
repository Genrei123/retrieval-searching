package com.example.retrieval_search.chunking;

import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Fallback chunking strategy (spec §2) for formats without recoverable heading structure
 * (PDF/DOCX text extraction). Groups on sentence boundaries rather than blank-line paragraphs:
 * Tika's PDF text extraction does not reliably preserve paragraph whitespace, so sentence
 * boundaries are the closest robust proxy for "paragraph boundary" available here.
 */
@Component
public class PlainTextChunker {

    private static final java.util.regex.Pattern SENTENCE_BOUNDARY =
            java.util.regex.Pattern.compile("(?<=[.!?])\\s+");

    public List<SectionDraft> chunk(String text) {
        String normalized = text.replaceAll("\\s+", " ").trim();
        if (normalized.isEmpty()) {
            return List.of();
        }
        List<String> sentences = List.of(SENTENCE_BOUNDARY.split(normalized));
        List<String> bodies = ChunkPostProcessor.groupUnits(
                sentences, " ", ChunkingRules.TARGET_WORDS, ChunkingRules.HARD_MAX_WORDS);

        List<SectionDraft> drafts = bodies.stream()
                .map(b -> new SectionDraft(null, b, null))
                .toList();

        return ChunkPostProcessor.mergeShortSections(drafts);
    }
}
