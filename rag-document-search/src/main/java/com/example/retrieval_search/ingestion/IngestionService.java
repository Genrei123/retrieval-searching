package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.chunking.MarkdownChunker;
import com.example.retrieval_search.chunking.PlainTextChunker;
import com.example.retrieval_search.chunking.SectionDraft;
import com.example.retrieval_search.domain.Document;
import com.example.retrieval_search.domain.DocumentFile;
import com.example.retrieval_search.domain.DocumentSection;
import com.example.retrieval_search.domain.JobStatus;
import com.example.retrieval_search.domain.IngestionProgress;
import com.example.retrieval_search.extraction.TextExtractor;
import com.example.retrieval_search.repository.DocumentFileRepository;
import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.repository.DocumentSectionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IngestionService {

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    private final DocumentRepository documentRepository;
    private final DocumentSectionRepository sectionRepository;
    private final DocumentFileRepository fileRepository;
    private final List<TextExtractor> extractors;
    private final MarkdownChunker markdownChunker;
    private final PlainTextChunker plainTextChunker;

    public IngestionService(DocumentRepository documentRepository,
                             DocumentSectionRepository sectionRepository,
                             DocumentFileRepository fileRepository,
                             List<TextExtractor> extractors,
                             MarkdownChunker markdownChunker,
                             PlainTextChunker plainTextChunker) {
        this.documentRepository = documentRepository;
        this.sectionRepository = sectionRepository;
        this.fileRepository = fileRepository;
        this.extractors = extractors;
        this.markdownChunker = markdownChunker;
        this.plainTextChunker = plainTextChunker;
    }

    @Transactional
    public IngestOutcome ingest(String title, String sourceUri, String contentType, String version,
                                 String filename, byte[] bytes) {
        return ingest(title, sourceUri, contentType, version, filename, bytes, ignored -> {});
    }

    @Transactional
    public IngestOutcome ingest(String title, String sourceUri, String contentType, String version,
                               String filename, byte[] bytes, Consumer<IngestionProgress> progress) {
        validateMetadata(title, version);
        String checksum = sha256(bytes);
        Optional<Document> existing = documentRepository.findByTitle(title);

        if (existing.isPresent() && existing.get().checksum().equals(checksum)) {
            UUID existingId = existing.get().id();
            // Documents ingested before originals were kept have identical content but no file on
            // record, so an unchanged re-upload is the chance to backfill one.
            if (!fileRepository.existsForDocument(existingId)) {
                storeOriginal(existingId, contentType, filename, bytes);
                return new IngestOutcome(
                        JobStatus.SKIPPED_UNCHANGED, "checksum unchanged, stored original file", existingId);
            }
            return new IngestOutcome(JobStatus.SKIPPED_UNCHANGED, "checksum unchanged, skipped", existingId);
        }
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A document with this title already exists. Use Edit / Replace file to update it.");
        }
        return index(UUID.randomUUID(), title, sourceUri, contentType, version, filename, bytes, checksum, progress);
    }

    @Transactional
    public IngestOutcome update(UUID id, String title, String sourceUri, String version,
                                String contentType, String filename, byte[] bytes, Consumer<IngestionProgress> progress) {
        validateMetadata(title, version);
        Document existing = documentRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown document: " + id));
        var sameTitle = documentRepository.findByTitle(title);
        if (sameTitle.isPresent() && !sameTitle.get().id().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Another document already uses this title.");
        }
        if (bytes == null || (existing.checksum().equals(sha256(bytes)) && existing.contentType().equals(contentType))) {
            progress.accept(IngestionProgress.at("METADATA"));
            documentRepository.upsert(new Document(id, title, sourceUri, existing.contentType(), version,
                    existing.ingestedAt(), existing.checksum()));
            if (bytes != null) storeOriginal(id, contentType, filename, bytes);
            return new IngestOutcome(JobStatus.SKIPPED_UNCHANGED, "Document updated; existing chunks retained.", id);
        }
        return index(id, title, sourceUri, contentType, version, filename, bytes, sha256(bytes), progress);
    }

    public static void validateMetadata(String title, String version) {
        if (title == null || title.isBlank() || title.length() > 200)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title must be 1-200 characters.");
        if (version == null || version.isBlank() || version.length() > 50)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Version must be 1-50 characters.");
    }

    private IngestOutcome index(UUID documentId, String title, String sourceUri, String contentType, String version,
                                String filename, byte[] bytes, String checksum, Consumer<IngestionProgress> progress) {
        progress.accept(IngestionProgress.at("EXTRACTING"));
        TextExtractor extractor = extractors.stream()
                .filter(e -> e.supports(contentType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported contentType: " + contentType));
        String text = extractor.extract(bytes).text();
        if (text.isBlank()) throw new IllegalArgumentException("No readable text found. Scanned PDFs need OCR before upload.");

        boolean headingAware = "markdown".equalsIgnoreCase(contentType) || "html".equalsIgnoreCase(contentType);
        var extracted = IngestionProgress.extracted(headingAware ? "HEADINGS" : "SENTENCES", text);
        progress.accept(extracted);
        List<SectionDraft> drafts = headingAware ? markdownChunker.chunk(text) : plainTextChunker.chunk(text);
        if (drafts.isEmpty()) throw new IllegalArgumentException("No searchable chunks could be created from this file.");
        progress.accept(extracted.chunked(drafts));

        Document document = new Document(documentId, title, sourceUri, contentType, version, Instant.now(), checksum);
        documentRepository.upsert(document);
        sectionRepository.deleteByDocumentId(documentId);

        List<DocumentSection> sections = new ArrayList<>();
        int ordinal = 0;
        for (SectionDraft draft : drafts) {
            sections.add(new DocumentSection(
                    UUID.randomUUID(), documentId, ordinal++, draft.headingPath(), draft.body(), draft.anchor()));
        }
        sectionRepository.insertAll(sections);
        storeOriginal(documentId, contentType, filename, bytes);

        return new IngestOutcome(JobStatus.DONE, "ingested " + sections.size() + " section(s)", documentId);
    }

    private void storeOriginal(UUID documentId, String contentType, String filename, byte[] bytes) {
        fileRepository.upsert(new DocumentFile(
                documentId, filename, mediaTypeFor(contentType), bytes.length, bytes));
    }

    /** Our coarse ingestion `contentType` ("pdf", "markdown", "html") mapped to what a browser
     * needs to render the original file. */
    private static String mediaTypeFor(String contentType) {
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "pdf" -> "application/pdf";
            case "markdown" -> "text/markdown";
            case "html" -> "text/html";
            default -> "application/octet-stream";
        };
    }

    private String sha256(byte[] bytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(bytes));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public record IngestOutcome(JobStatus status, String message, UUID documentId) {
    }
}
