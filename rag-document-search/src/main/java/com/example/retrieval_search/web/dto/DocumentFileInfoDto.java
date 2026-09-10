package com.example.retrieval_search.web.dto;

/** What the UI needs to offer the original file — the bytes themselves come from
 * `GET /documents/{id}/file`. */
public record DocumentFileInfoDto(
        String filename,
        String mediaType,
        long byteSize
) {
}
