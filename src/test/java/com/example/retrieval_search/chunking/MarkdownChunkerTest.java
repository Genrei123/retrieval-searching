package com.example.retrieval_search.chunking;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MarkdownChunkerTest {

    private final MarkdownChunker chunker = new MarkdownChunker();

    @Test
    void splitsOnHeadingBoundariesAndBuildsHeadingPath() {
        // Each body is padded past the 50-word minimum so the merge-short-sections pass
        // (covered separately below) does not fold these two sections together.
        String markdown = """
                # Spring Framework

                ## Web

                ### Spring MVC

                Spring MVC is the servlet-based web framework built around DispatcherServlet.
                %s

                ### Spring WebFlux

                WebFlux is the reactive alternative built on Project Reactor.
                %s
                """.formatted("word ".repeat(50).trim(), "word ".repeat(50).trim());

        List<SectionDraft> sections = chunker.chunk(markdown);

        assertThat(sections).hasSize(2);
        assertThat(sections.get(0).headingPath()).isEqualTo("Spring Framework > Web > Spring MVC");
        assertThat(sections.get(0).body()).contains("DispatcherServlet");
        assertThat(sections.get(1).headingPath()).isEqualTo("Spring Framework > Web > Spring WebFlux");
    }

    @Test
    void mergesSectionsShorterThanMinimumIntoTheNextSibling() {
        String markdown = """
                # Doc

                ## Short

                Too brief.

                ## Next

                %s
                """.formatted("word ".repeat(60).trim());

        List<SectionDraft> sections = chunker.chunk(markdown);

        assertThat(sections).hasSize(1);
        assertThat(sections.get(0).headingPath()).isEqualTo("Doc > Next");
        assertThat(sections.get(0).body()).contains("Too brief.");
    }
}
