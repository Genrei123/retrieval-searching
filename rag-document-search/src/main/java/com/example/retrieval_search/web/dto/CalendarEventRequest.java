package com.example.retrieval_search.web.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * A planner entry as the UI sends it. {@code kind} is deliberately absent — everything created
 * through the API is PERSONAL; holidays only ever arrive by migration.
 *
 * @param date      the day it falls on, {@code yyyy-MM-dd}
 * @param startTime {@code HH:mm}, or null for an all-day entry
 * @param title     what it is; required
 * @param notes     optional detail
 */
public record CalendarEventRequest(
        LocalDate date,
        LocalTime startTime,
        String title,
        String notes
) {
}
