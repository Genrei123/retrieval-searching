package com.example.retrieval_search.extraction;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class MarkdownTextExtractor implements TextExtractor {

    @Override
    public boolean supports(String contentType) {
        return "markdown".equalsIgnoreCase(contentType);
    }

    @Override
    public ExtractedText extract(byte[] bytes) {
        return new ExtractedText(new String(bytes, StandardCharsets.UTF_8));
    }
}
