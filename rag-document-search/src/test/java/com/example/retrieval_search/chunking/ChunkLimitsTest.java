package com.example.retrieval_search.chunking;

import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;

class ChunkLimitsTest {
    @Test
    void longParagraphAndSentenceRespectHardLimitWithoutLosingWords() {
        String body = "word ".repeat(2401).trim();
        for (var chunks : List.of(new MarkdownChunker().chunk("# Heading\n" + body), new PlainTextChunker().chunk(body))) {
            assertThat(chunks).allSatisfy(chunk -> assertThat(chunk.wordCount()).isLessThanOrEqualTo(800));
            assertThat(chunks.stream().mapToInt(SectionDraft::wordCount).sum()).isEqualTo(2401);
        }
    }

    @Test
    void mergingAShortSectionCannotOverflowItsNeighbor() {
        var chunks = new MarkdownChunker().chunk("# First\n" + "large ".repeat(800) + "\n# Last\nsmall text");
        assertThat(chunks).hasSize(2).allSatisfy(chunk -> assertThat(chunk.wordCount()).isLessThanOrEqualTo(800));
        assertThat(chunks.stream().mapToInt(SectionDraft::wordCount).sum()).isEqualTo(802);
    }
}
