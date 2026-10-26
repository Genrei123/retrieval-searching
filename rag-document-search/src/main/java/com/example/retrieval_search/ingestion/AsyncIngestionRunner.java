package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.domain.JobStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Separate bean from IngestionService so the @Async entry point invokes
 * IngestionService.ingest(...) as an external (proxied) call — calling it via self-invocation
 * from within IngestionService itself would silently bypass its @Transactional advice.
 */
@Component
public class AsyncIngestionRunner {

    private static final Logger log = LoggerFactory.getLogger(AsyncIngestionRunner.class);

    private final IngestionService ingestionService;
    private final JobStore jobStore;

    public AsyncIngestionRunner(IngestionService ingestionService, JobStore jobStore) {
        this.ingestionService = ingestionService;
        this.jobStore = jobStore;
    }

    @Async
    public void run(UUID jobId, String title, String sourceUri, String contentType, String version,
                     String filename, byte[] bytes) {
        jobStore.update(jobId, JobStatus.RUNNING, null, null);
        try {
            IngestionService.IngestOutcome outcome =
                    ingestionService.ingest(title, sourceUri, contentType, version, filename, bytes,
                            progress -> jobStore.progress(jobId, progress));
            jobStore.update(jobId, outcome.status(), outcome.message(), outcome.documentId());
        } catch (Exception e) {
            log.warn("Ingestion job {} failed", jobId, e);
            jobStore.update(jobId, JobStatus.FAILED, e.getMessage(), null);
        }
    }

    @Async
    public void update(UUID jobId, UUID documentId, String title, String sourceUri, String version,
                       String contentType, String filename, byte[] bytes) {
        jobStore.update(jobId, JobStatus.RUNNING, null, documentId);
        try {
            var outcome = ingestionService.update(documentId, title, sourceUri, version, contentType, filename, bytes,
                    progress -> jobStore.progress(jobId, progress));
            jobStore.update(jobId, outcome.status(), outcome.message(), documentId);
        } catch (Exception e) {
            log.warn("Document update {} failed", jobId, e);
            jobStore.update(jobId, JobStatus.FAILED, e.getMessage(), documentId);
        }
    }
}
