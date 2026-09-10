package com.example.retrieval_search.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * One row on the homepage calendar: either something the user put in their planner, or a
 * Philippine holiday seeded by migration. {@code startTime} is null for an all-day entry, which
 * every holiday is.
 */
public record CalendarEvent(
        UUID id,
        LocalDate date,
        LocalTime startTime,
        String title,
        String notes,
        EventKind kind,
        Instant createdAt
) {
}
