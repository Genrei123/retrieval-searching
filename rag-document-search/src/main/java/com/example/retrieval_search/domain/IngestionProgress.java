package com.example.retrieval_search.domain;

import com.example.retrieval_search.chunking.ChunkingRules;
import com.example.retrieval_search.chunking.SectionDraft;
import java.util.List;

/** Bounded preview of the actual chunker output, never simulated progress. */
public record IngestionProgress(String stage, String strategy, int extractedWords, int totalChunks,
                                int targetWords, int maxWords, int minWords, List<ChunkPreview> chunks) {
    public record ChunkPreview(int ordinal, String headingPath, int wordCount, String preview) {}

    public static IngestionProgress at(String stage) {
        return new IngestionProgress(stage, null, 0, 0, ChunkingRules.TARGET_WORDS,
                ChunkingRules.HARD_MAX_WORDS, ChunkingRules.MIN_WORDS, List.of());
    }

    public static IngestionProgress extracted(String strategy, String text) {
        int words = text.isBlank() ? 0 : text.trim().split("\\s+").length;
        return new IngestionProgress("CHUNKING", strategy, words, 0,
                ChunkingRules.TARGET_WORDS, ChunkingRules.HARD_MAX_WORDS, ChunkingRules.MIN_WORDS, List.of());
    }

    public IngestionProgress chunked(List<SectionDraft> drafts) {
        var previews = java.util.stream.IntStream.range(0, Math.min(100, drafts.size())).mapToObj(i -> {
            var draft = drafts.get(i);
            return new ChunkPreview(i, draft.headingPath(), draft.wordCount(),
                    draft.body().substring(0, Math.min(300, draft.body().length())));
        }).toList();
        return new IngestionProgress("INDEXING", strategy, extractedWords, drafts.size(),
                targetWords, maxWords, minWords, previews);
    }

    public IngestionProgress withStage(String stage) {
        return new IngestionProgress(stage, strategy, extractedWords, totalChunks, targetWords, maxWords, minWords, chunks);
    }
}
