package com.example.retrieval_search.web.dto;

import com.example.retrieval_search.domain.JobStatus;

import java.util.UUID;

public record JobStatusResponse(UUID jobId, JobStatus status, String message, UUID documentId) {
}
