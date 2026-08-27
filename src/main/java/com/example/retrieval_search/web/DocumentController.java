package com.example.retrieval_search.web;

import com.example.retrieval_search.domain.IngestionJob;
import com.example.retrieval_search.ingestion.AsyncIngestionRunner;
import com.example.retrieval_search.ingestion.JobStore;
import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.web.dto.IngestResponse;
import com.example.retrieval_search.web.dto.JobStatusResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Documents", description = "Upload, track, and remove documents")
public class DocumentController {

    private final AsyncIngestionRunner asyncIngestionRunner;
    private final JobStore jobStore;
    private final DocumentRepository documentRepository;

    public DocumentController(AsyncIngestionRunner asyncIngestionRunner, JobStore jobStore,
                               DocumentRepository documentRepository) {
        this.asyncIngestionRunner = asyncIngestionRunner;
        this.jobStore = jobStore;
        this.documentRepository = documentRepository;
    }

    @Operation(summary = "Upload a document for ingestion", description = "Accepts a PDF, Markdown, or HTML file and starts an async ingestion job.")
    @PostMapping(value = "/documents", consumes = "multipart/form-data")
    public ResponseEntity<IngestResponse> ingest(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "sourceUri", required = false) String sourceUri,
            @RequestParam(value = "version", required = false, defaultValue = "1") String version) {

        String contentType = detectContentType(file.getOriginalFilename());
        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unreadable upload", e);
        }

        UUID jobId = jobStore.create();
        asyncIngestionRunner.run(jobId, title, sourceUri, contentType, version, bytes);

        return ResponseEntity.accepted().body(new IngestResponse(jobId));
    }

    @Operation(summary = "Get ingestion job status")
    @GetMapping("/documents/jobs/{jobId}")
    public JobStatusResponse jobStatus(@PathVariable UUID jobId) {
        IngestionJob job = jobStore.find(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown jobId: " + jobId));
        return new JobStatusResponse(job.jobId(), job.status(), job.message(), job.documentId());
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
