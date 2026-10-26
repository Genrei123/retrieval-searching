package com.example.retrieval_search.domain;

import java.util.UUID;

public record IngestionJob(UUID jobId, JobStatus status, String message, UUID documentId, IngestionProgress progress) {

    public static IngestionJob pending(UUID jobId) {
        return new IngestionJob(jobId, JobStatus.PENDING, null, null, IngestionProgress.at("QUEUED"));
    }

    public IngestionJob withStatus(JobStatus status, String message, UUID documentId) {
        String stage = switch (status) {
            case DONE -> "DONE";
            case FAILED -> progress.stage();
            case SKIPPED_UNCHANGED -> "UNCHANGED";
            default -> progress.stage();
        };
        return new IngestionJob(this.jobId, status, message, documentId, progress.withStage(stage));
    }

    public IngestionJob withProgress(IngestionProgress progress) {
        return new IngestionJob(jobId, status, message, documentId, progress);
    }
}
