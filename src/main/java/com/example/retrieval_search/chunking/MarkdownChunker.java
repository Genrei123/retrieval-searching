package com.example.retrieval_search.chunking;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Primary chunking strategy (spec §2): splits Markdown/HTML-sourced text on H1-H3 heading
 * boundaries, retaining the heading path per section. Falls back to paragraph-boundary
 * grouping only when a single heading's content exceeds the 800-word hard maximum.
 */
@Component
public class MarkdownChunker {

    private static final Pattern HEADING = Pattern.compile("^(#{1,3})\\s+(.+?)\\s*$");

    public List<SectionDraft> chunk(String markdown) {
        String[] lines = markdown.split("\n", -1);
        String[] headingStack = new String[3];
        List<SectionDraft> raw = new ArrayList<>();

        StringBuilder body = new StringBuilder();
        String currentHeadingPath = null;
        String currentAnchor = null;

        for (String line : lines) {
            Matcher m = HEADING.matcher(line);
            if (m.matches()) {
                flush(raw, currentHeadingPath, body, currentAnchor);
                body = new StringBuilder();

                int level = m.group(1).length();
                String headingText = m.group(2).trim();
                headingStack[level - 1] = headingText;
                for (int i = level; i < headingStack.length; i++) {
                    headingStack[i] = null;
                }
                currentHeadingPath = Arrays.stream(headingStack)
                        .filter(h -> h != null && !h.isEmpty())
                        .collect(Collectors.joining(" > "));
                currentAnchor = slugify(headingText);
            } else {
                body.append(line).append("\n");
            }
        }
        flush(raw, currentHeadingPath, body, currentAnchor);

        List<SectionDraft> withHardMaxEnforced = new ArrayList<>();
        for (SectionDraft draft : raw) {
            if (draft.wordCount() <= ChunkingRules.HARD_MAX_WORDS) {
                withHardMaxEnforced.add(draft);
                continue;
            }
            List<String> paragraphs = List.of(draft.body().split("\\n\\s*\\n"));
            List<String> subBodies = ChunkPostProcessor.groupUnits(
                    paragraphs, "\n\n", ChunkingRules.TARGET_WORDS, ChunkingRules.HARD_MAX_WORDS);
            for (String subBody : subBodies) {
                withHardMaxEnforced.add(new SectionDraft(draft.headingPath(), subBody, draft.anchor()));
            }
        }

        return ChunkPostProcessor.mergeShortSections(withHardMaxEnforced);
    }

    private void flush(List<SectionDraft> drafts, String headingPath, StringBuilder body, String anchor) {
        String trimmed = body.toString().trim();
        if (!trimmed.isEmpty()) {
            drafts.add(new SectionDraft(headingPath, trimmed, anchor));
        }
    }

    private String slugify(String headingText) {
        String slug = headingText.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-");
        return "#" + slug;
    }
}
