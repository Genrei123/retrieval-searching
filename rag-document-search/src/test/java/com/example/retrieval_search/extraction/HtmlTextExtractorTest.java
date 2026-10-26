package com.example.retrieval_search.extraction;

import com.example.retrieval_search.chunking.MarkdownChunker;
import org.junit.jupiter.api.Test;
import java.nio.charset.StandardCharsets;
import static org.assertj.core.api.Assertions.assertThat;

class HtmlTextExtractorTest {
    @Test
    void extractsHeadingsAndVisibleTextWithoutMarkupOrScripts() {
        String html = "<html><head><title>Hidden title</title><style>.secret {}</style></head><body>"
                + "<h1>Dataset &amp; Guide</h1><h2>Section</h2><p>" + "Visible <b>text</b> ".repeat(30)
                + "</p><script>secretCode()</script></body></html>";
        String text = new HtmlTextExtractor().extract(html.getBytes(StandardCharsets.UTF_8)).text();
        assertThat(text).contains("# Dataset & Guide", "## Section", "Visible", "text")
                .doesNotContain("secretCode", ".secret", "Hidden title", "<p>", "<b>");
        assertThat(new MarkdownChunker().chunk(text).getFirst().headingPath()).isEqualTo("Dataset & Guide > Section");
    }
}
