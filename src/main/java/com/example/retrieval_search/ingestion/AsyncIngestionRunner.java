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
    public void run(UUID jobId, String title, String sourceUri, String contentType, String version, byte[] bytes) {
        jobStore.update(jobId, JobStatus.RUNNING, null, null);
        try {
            IngestionService.IngestOutcome outcome =
                    ingestionService.ingest(title, sourceUri, contentType, version, bytes);
            jobStore.update(jobId, outcome.status(), outcome.message(), outcome.documentId());
        } catch (Exception e) {
            log.warn("Ingestion job {} failed", jobId, e);
            jobStore.update(jobId, JobStatus.FAILED, e.getMessage(), null);
        }
    }
}
