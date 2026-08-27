package com.example.retrieval_search.extraction;

public interface TextExtractor {

    boolean supports(String contentType);

    ExtractedText extract(byte[] bytes);
}
