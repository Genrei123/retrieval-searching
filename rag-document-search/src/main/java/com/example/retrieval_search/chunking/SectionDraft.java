package com.example.retrieval_search.chunking;

/** Pre-persistence chunk produced by a chunker, before ordinal assignment and ID generation. */
public record SectionDraft(String headingPath, String body, String anchor) {

    public int wordCount() {
        String trimmed = body.trim();
        if (trimmed.isEmpty()) {
            return 0;
        }
        return trimmed.split("\\s+").length;
    }
}
