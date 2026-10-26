package com.example.retrieval_search.web;

import com.example.retrieval_search.domain.Document;
import com.example.retrieval_search.domain.DocumentFile;
import com.example.retrieval_search.domain.DocumentSection;
import com.example.retrieval_search.domain.IngestionJob;
import com.example.retrieval_search.ingestion.AsyncIngestionRunner;
import com.example.retrieval_search.ingestion.JobStore;
import com.example.retrieval_search.ingestion.IngestionService;
import com.example.retrieval_search.repository.DocumentFileRepository;
import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.repository.DocumentSectionRepository;
import com.example.retrieval_search.web.dto.DocumentContentDto;
import com.example.retrieval_search.web.dto.DocumentFileInfoDto;
import com.example.retrieval_search.web.dto.DocumentSectionDto;
import com.example.retrieval_search.web.dto.IngestResponse;
import com.example.retrieval_search.web.dto.JobStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Documents", description = "Upload, track, and remove documents")
public class DocumentController {

    private final AsyncIngestionRunner asyncIngestionRunner;
    private final JobStore jobStore;
    private final DocumentRepository documentRepository;
    private final DocumentSectionRepository documentSectionRepository;
    private final DocumentFileRepository documentFileRepository;

    public DocumentController(AsyncIngestionRunner asyncIngestionRunner, JobStore jobStore,
                               DocumentRepository documentRepository,
                               DocumentSectionRepository documentSectionRepository,
                               DocumentFileRepository documentFileRepository) {
        this.asyncIngestionRunner = asyncIngestionRunner;
        this.jobStore = jobStore;
        this.documentRepository = documentRepository;
        this.documentSectionRepository = documentSectionRepository;
        this.documentFileRepository = documentFileRepository;
    }

    @Operation(summary = "Upload a document for ingestion", description = "Accepts a PDF, Markdown, or HTML file and starts an async ingestion job.")
    @PostMapping(value = "/documents", consumes = "multipart/form-data")
    public ResponseEntity<IngestResponse> ingest(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "sourceUri", required = false) String sourceUri,
            @RequestParam(value = "version", required = false, defaultValue = "1") String version) {

        IngestionService.validateMetadata(title, version);
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The uploaded file is empty.");
        String contentType = detectContentType(file.getOriginalFilename());
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unreadable upload", e);
        }

        UUID jobId = jobStore.create();
        asyncIngestionRunner.run(jobId, title.trim(), sourceUri, contentType, version.trim(), file.getOriginalFilename(), bytes);

        return ResponseEntity.accepted().body(new IngestResponse(jobId));
    }

    @Operation(summary = "Edit document metadata or replace its file", description = "Keeps the document ID. A replacement file is re-chunked and indexed atomically; omit file to keep its content.")
    @PutMapping(value = "/documents/{id}", consumes = "multipart/form-data")
    public ResponseEntity<IngestResponse> update(@PathVariable UUID id,
            @RequestParam("title") String title,
            @RequestParam(value = "sourceUri", required = false) String sourceUri,
            @RequestParam(value = "version", defaultValue = "1") String version,
            @RequestParam(value = "file", required = false) MultipartFile file) {
        get(id);
        IngestionService.validateMetadata(title, version);
        String contentType = null;
        byte[] bytes = null;
        if (file != null) {
            if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "The replacement file is empty.");
            contentType = detectContentType(file.getOriginalFilename());
            try { bytes = file.getBytes(); }
            catch (IOException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unreadable upload", e); }
        }
        UUID jobId = jobStore.create();
        asyncIngestionRunner.update(jobId, id, title.trim(), sourceUri, version.trim(), contentType,
                file == null ? null : file.getOriginalFilename(), bytes);
        return ResponseEntity.accepted().body(new IngestResponse(jobId));
    }

    @Operation(summary = "List uploaded documents", description = "Returns all ingested documents, most recently ingested first.")
    @GetMapping("/documents")
    public List<Document> list() {
        return documentRepository.findAll();
    }

    @Operation(summary = "Get a single document", description = "Returns the document's metadata, without its sections.")
    @GetMapping("/documents/{id}")
    public Document get(@PathVariable UUID id) {
        return documentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown document: " + id));
    }

    @Operation(summary = "Get a document's full content",
            description = "Returns the document plus every section of it in reading order, so a search hit or "
                    + "answer source can be read in context.")
    @GetMapping("/documents/{id}/content")
    public DocumentContentDto content(@PathVariable UUID id) {
        Document document = get(id);
        List<DocumentSectionDto> sections = documentSectionRepository.findByDocumentId(id).stream()
                .map(DocumentController::toDto)
                .toList();
        DocumentFileInfoDto original = documentFileRepository.findInfoByDocumentId(id)
                .map(file -> new DocumentFileInfoDto(file.filename(), file.mediaType(), file.byteSize()))
                .orElse(null);
        return new DocumentContentDto(document, original, sections);
    }

    @Operation(summary = "Download a document's original file",
            description = "Serves the file exactly as it was uploaded. 404 for documents ingested before "
                    + "originals were kept — re-upload the file to store one.")
    @GetMapping("/documents/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable UUID id) {
        DocumentFile file = documentFileRepository.findByDocumentId(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No original file stored for document: " + id));

        ContentDisposition disposition = ContentDisposition.inline()
                .filename(file.filename() != null ? file.filename() : "document")
                .build();

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(file.content());
    }

    @Operation(summary = "Get ingestion job status")
    @GetMapping("/documents/jobs/{jobId}")
    public JobStatusResponse jobStatus(@PathVariable UUID jobId) {
        IngestionJob job = jobStore.find(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown jobId: " + jobId));
        return new JobStatusResponse(job.jobId(), job.status(), job.message(), job.documentId(), job.progress());
    }

    @Operation(summary = "Delete a document", description = "Removes the document and its sections (sections cascade via the database).")
    @DeleteMapping("/documents/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        boolean deleted = documentRepository.deleteById(id);
        if (!deleted) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown document: " + id);
        }
        return ResponseEntity.noContent().build();
    }

    private static DocumentSectionDto toDto(DocumentSection section) {
        return new DocumentSectionDto(
                section.id(), section.ordinal(), section.headingPath(), section.anchor(), section.body());
    }

    private String detectContentType(String filename) {
        if (filename == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing filename");
        }
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".md") || lower.endsWith(".markdown")) {
            return "markdown";
        }
        if (lower.endsWith(".html") || lower.endsWith(".htm")) {
            return "html";
        }
        if (lower.endsWith(".pdf")) {
            return "pdf";
        }
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported file type: " + filename);
    }
}
