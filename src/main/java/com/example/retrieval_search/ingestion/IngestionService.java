package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.chunking.MarkdownChunker;
import com.example.retrieval_search.chunking.PlainTextChunker;
import com.example.retrieval_search.chunking.SectionDraft;
import com.example.retrieval_search.domain.Document;
import com.example.retrieval_search.domain.DocumentSection;
import com.example.retrieval_search.domain.JobStatus;
import com.example.retrieval_search.extraction.TextExtractor;
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
import java.util.Optional;
import java.util.UUID;

@Service
public class IngestionService {

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    private final DocumentRepository documentRepository;
    private final DocumentSectionRepository sectionRepository;
    private final List<TextExtractor> extractors;
    private final MarkdownChunker markdownChunker;
    private final PlainTextChunker plainTextChunker;

    public IngestionService(DocumentRepository documentRepository,
                             DocumentSectionRepository sectionRepository,
                             List<TextExtractor> extractors,
                             MarkdownChunker markdownChunker,
                             PlainTextChunker plainTextChunker) {
        this.documentRepository = documentRepository;
        this.sectionRepository = sectionRepository;
        this.extractors = extractors;
        this.markdownChunker = markdownChunker;
        this.plainTextChunker = plainTextChunker;
    }

    @Transactional
    public IngestOutcome ingest(String title, String sourceUri, String contentType, String version, byte[] bytes) {
        String checksum = sha256(bytes);
        Optional<Document> existing = documentRepository.findByTitle(title);

        if (existing.isPresent() && existing.get().checksum().equals(checksum)) {
            return new IngestOutcome(JobStatus.SKIPPED_UNCHANGED, "checksum unchanged, skipped", existing.get().id());
        }

        UUID documentId = existing.map(Document::id).orElseGet(UUID::randomUUID);

        TextExtractor extractor = extractors.stream()
                .filter(e -> e.supports(contentType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported contentType: " + contentType));
        String text = extractor.extract(bytes).text();

        boolean headingAware = "markdown".equalsIgnoreCase(contentType) || "html".equalsIgnoreCase(contentType);
        List<SectionDraft> drafts = headingAware ? markdownChunker.chunk(text) : plainTextChunker.chunk(text);

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

        return new IngestOutcome(JobStatus.DONE, "ingested " + sections.size() + " section(s)", documentId);
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
