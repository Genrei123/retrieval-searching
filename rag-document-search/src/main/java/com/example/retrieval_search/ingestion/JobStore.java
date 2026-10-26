package com.example.retrieval_search.ingestion;

import com.example.retrieval_search.domain.IngestionJob;
import com.example.retrieval_search.domain.JobStatus;
import com.example.retrieval_search.domain.IngestionProgress;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.time.Instant;
import java.time.Duration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * In-memory job tracking for the async ingestion endpoint. Not part of the spec's data model —
 * a POC simplification standing in for a persisted jobs table; job state resets on restart.
 */
@Component
public class JobStore {

    private record Stored(IngestionJob job, Instant createdAt) {}
    private final Map<UUID, Stored> jobs = new ConcurrentHashMap<>();
    private static final int MAX_JOBS = 128;

    public synchronized UUID create() {
        Instant cutoff = Instant.now().minus(Duration.ofHours(1));
        jobs.entrySet().removeIf(e -> terminal(e.getValue().job()) && e.getValue().createdAt().isBefore(cutoff));
        if (jobs.size() >= MAX_JOBS) {
            jobs.entrySet().stream().filter(e -> terminal(e.getValue().job()))
                    .min(java.util.Comparator.comparing(e -> e.getValue().createdAt()))
                    .ifPresent(e -> jobs.remove(e.getKey()));
        }
        if (jobs.size() >= MAX_JOBS) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Upload queue is full. Try again shortly.");
        UUID jobId = UUID.randomUUID();
        jobs.put(jobId, new Stored(IngestionJob.pending(jobId), Instant.now()));
        return jobId;
    }

    public void update(UUID jobId, JobStatus status, String message, UUID documentId) {
        jobs.computeIfPresent(jobId, (id, stored) -> new Stored(stored.job().withStatus(status, message, documentId), stored.createdAt()));
    }

    public Optional<IngestionJob> find(UUID jobId) {
        return Optional.ofNullable(jobs.get(jobId)).map(Stored::job);
    }

    public void progress(UUID jobId, IngestionProgress progress) {
        jobs.computeIfPresent(jobId, (id, stored) -> new Stored(stored.job().withProgress(progress), stored.createdAt()));
    }

    private boolean terminal(IngestionJob job) {
        return job.status() != JobStatus.PENDING && job.status() != JobStatus.RUNNING;
    }
}
