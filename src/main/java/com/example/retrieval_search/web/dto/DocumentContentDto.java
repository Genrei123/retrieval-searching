package com.example.retrieval_search.web.dto;

import com.example.retrieval_search.domain.Document;

import java.util.List;

/** A document plus every section of it, in reading order — what the UI renders when you open a
 * search hit or an answer source and want to see the passage in its surrounding document.
 * `original` describes the uploaded file when one is on record, and is null for documents
 * ingested before originals were kept. */
public record DocumentContentDto(
        Document document,
        DocumentFileInfoDto original,
        List<DocumentSectionDto> sections
) {
}
