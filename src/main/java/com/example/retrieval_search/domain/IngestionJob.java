package com.example.retrieval_search.domain;

import java.util.UUID;

public record IngestionJob(UUID jobId, JobStatus status, String message, UUID documentId) {

    public static IngestionJob pending(UUID jobId) {
        return new IngestionJob(jobId, JobStatus.PENDING, null, null);
    }

    public IngestionJob withStatus(JobStatus status, String message, UUID documentId) {
        return new IngestionJob(this.jobId, status, message, documentId);
    }
}
