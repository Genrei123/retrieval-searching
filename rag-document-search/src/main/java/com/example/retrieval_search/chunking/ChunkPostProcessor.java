package com.example.retrieval_search.chunking;

import java.util.ArrayList;
import java.util.List;

/** Shared paragraph/sentence grouping and short-section merging, used by both chunkers. */
final class ChunkPostProcessor {

    private ChunkPostProcessor() {
    }

    static List<String> groupUnits(List<String> units, String joiner, int targetWords, int hardMaxWords) {
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int currentWords = 0;
        for (String unit : units) {
            String trimmedUnit = unit.trim();
            if (trimmedUnit.isEmpty()) {
                continue;
            }
            int unitWords = wordCount(trimmedUnit);
            if (currentWords > 0 && currentWords + unitWords > hardMaxWords) {
                chunks.add(current.toString().trim());
                current = new StringBuilder();
                currentWords = 0;
            }
            if (current.length() > 0) {
                current.append(joiner);
            }
            current.append(trimmedUnit);
            currentWords += unitWords;
            if (currentWords >= targetWords) {
                chunks.add(current.toString().trim());
                current = new StringBuilder();
                currentWords = 0;
            }
        }
        if (current.length() > 0) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    static List<SectionDraft> mergeShortSections(List<SectionDraft> drafts) {
        List<SectionDraft> result = new ArrayList<>(drafts);
        int i = 0;
        while (i < result.size() && result.size() > 1) {
            SectionDraft draft = result.get(i);
            if (draft.wordCount() >= ChunkingRules.MIN_WORDS) {
                i++;
                continue;
            }
            if (i + 1 < result.size()) {
                SectionDraft next = result.get(i + 1);
                SectionDraft merged = new SectionDraft(
                        next.headingPath(),
                        draft.body().trim() + "\n\n" + next.body().trim(),
                        next.anchor());
                result.set(i + 1, merged);
                result.remove(i);
            } else {
                SectionDraft prev = result.get(i - 1);
                SectionDraft merged = new SectionDraft(
                        prev.headingPath(),
                        prev.body().trim() + "\n\n" + draft.body().trim(),
                        prev.anchor());
                result.set(i - 1, merged);
                result.remove(i);
            }
        }
        return result;
    }

    static int wordCount(String s) {
        String trimmed = s.trim();
        if (trimmed.isEmpty()) {
            return 0;
        }
        return trimmed.split("\\s+").length;
    }
}
