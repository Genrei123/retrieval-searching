package com.example.retrieval_search.extraction;

import org.springframework.stereotype.Component;
import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.HTML;
import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.ParserDelegator;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;

/** Extract visible HTML text and convert H1-H3 boundaries for the shared heading chunker. */
@Component
public class HtmlTextExtractor implements TextExtractor {
    @Override public boolean supports(String contentType) { return "html".equalsIgnoreCase(contentType); }

    @Override public ExtractedText extract(byte[] bytes) {
        StringBuilder text = new StringBuilder();
        try {
            new ParserDelegator().parse(new StringReader(new String(bytes, StandardCharsets.UTF_8)),
                    new HTMLEditorKit.ParserCallback() {
                        private int hidden;
                        private boolean hiddenTag(HTML.Tag tag) {
                            return tag == HTML.Tag.SCRIPT || tag == HTML.Tag.STYLE || tag == HTML.Tag.HEAD;
                        }
                        @Override public void handleStartTag(HTML.Tag tag, MutableAttributeSet attributes, int pos) {
                            if (hiddenTag(tag)) { hidden++; return; }
                            if (hidden > 0) return;
                            if (tag == HTML.Tag.H1 || tag == HTML.Tag.H2 || tag == HTML.Tag.H3) {
                                int level = Integer.parseInt(tag.toString().substring(1));
                                text.append("\n\n").append("#".repeat(level)).append(' ');
                            } else if (tag.isBlock()) text.append("\n\n");
                        }
                        @Override public void handleEndTag(HTML.Tag tag, int pos) {
                            if (hiddenTag(tag)) { hidden = Math.max(0, hidden - 1); return; }
                            if (hidden == 0 && tag.isBlock()) text.append("\n\n");
                        }
                        @Override public void handleSimpleTag(HTML.Tag tag, MutableAttributeSet attributes, int pos) {
                            if (hidden == 0 && (tag == HTML.Tag.BR || tag == HTML.Tag.HR)) text.append('\n');
                        }
                        @Override public void handleText(char[] data, int pos) {
                            if (hidden == 0) text.append(data).append(' ');
                        }
                    }, true);
            return new ExtractedText(text.toString().strip());
        } catch (Exception e) {
            throw new ExtractionException("Failed to extract text from HTML", e);
        }
    }
}
