package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.domain.IngestionJob;
import com.example.retrieval_search.domain.JobStatus;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory job tracking for the async ingestion endpoint. Not part of the spec's data model —
 * a POC simplification standing in for a persisted jobs table; job state resets on restart.
 */
@Component
public class JobStore {

    private final Map<UUID, IngestionJob> jobs = new ConcurrentHashMap<>();

    public UUID create() {
        UUID jobId = UUID.randomUUID();
        jobs.put(jobId, IngestionJob.pending(jobId));
        return jobId;
    }

    public void update(UUID jobId, JobStatus status, String message, UUID documentId) {
        jobs.computeIfPresent(jobId, (id, job) -> job.withStatus(status, message, documentId));
    }

    public Optional<IngestionJob> find(UUID jobId) {
        return Optional.ofNullable(jobs.get(jobId));
    }
}
