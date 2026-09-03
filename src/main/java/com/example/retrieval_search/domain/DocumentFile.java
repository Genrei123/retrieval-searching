package com.example.retrieval_search.domain;

import java.util.UUID;

/** The uploaded file as it arrived, kept so a document can be read in its original form and not
 * only as the sections it was chunked into. */
public record DocumentFile(
        UUID documentId,
        String filename,
        String mediaType,
        long byteSize,
        byte[] content
) {
}
