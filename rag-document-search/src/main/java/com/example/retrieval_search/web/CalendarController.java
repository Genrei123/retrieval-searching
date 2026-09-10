package com.example.retrieval_search.web;

import com.example.retrieval_search.domain.CalendarEvent;
import com.example.retrieval_search.domain.EventKind;
import com.example.retrieval_search.repository.CalendarEventRepository;
import com.example.retrieval_search.web.dto.CalendarEventRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * The homepage calendar: the user's planner plus the Philippine holidays it is laid over.
 *
 * Holidays are reference data — they are returned by the reads and refused by the writes, so the
 * UI can render them in the same grid without being able to edit them.
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Calendar", description = "Planner entries and Philippine holidays")
public class CalendarController {

    /** A month view asks for ~6 weeks; this bounds a hand-written range to something sane. */
    private static final int MAX_RANGE_DAYS = 400;

    private final CalendarEventRepository repository;

    public CalendarController(CalendarEventRepository repository) {
        this.repository = repository;
    }

    @Operation(summary = "List calendar entries in a date range",
            description = "Planner entries and holidays between two dates, inclusive, in day then time order.")
    @GetMapping("/calendar")
    public List<CalendarEvent> range(
            @RequestParam("from") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam("to") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "to is before from");
        }
        if (from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "range longer than " + MAX_RANGE_DAYS + " days");
        }
        return repository.findBetween(from, to);
    }

    @Operation(summary = "What is coming up",
            description = "Entries from today through the next N days. This is what the briefing workflow reads.")
    @GetMapping("/calendar/upcoming")
    public List<CalendarEvent> upcoming(@RequestParam(value = "days", defaultValue = "7") int days) {
        int window = Math.min(Math.max(days, 1), 60);
        LocalDate today = LocalDate.now();
        return repository.findBetween(today, today.plusDays(window));
    }

    @Operation(summary = "Add a planner entry")
    @PostMapping("/calendar")
    public ResponseEntity<CalendarEvent> create(@RequestBody CalendarEventRequest request) {
        String title = requireTitle(request);
        LocalDate date = requireDate(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(repository.insert(date, request.startTime(), title, trimToNull(request.notes())));
    }

    @Operation(summary = "Edit a planner entry", description = "Holidays cannot be edited.")
    @PutMapping("/calendar/{id}")
    public CalendarEvent update(@PathVariable UUID id, @RequestBody CalendarEventRequest request) {
        String title = requireTitle(request);
        LocalDate date = requireDate(request);
        rejectHoliday(id);
        return repository.update(id, date, request.startTime(), title, trimToNull(request.notes()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no such calendar entry"));
    }

    @Operation(summary = "Delete a planner entry", description = "Holidays cannot be deleted.")
    @DeleteMapping("/calendar/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        rejectHoliday(id);
        if (!repository.delete(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "no such calendar entry");
        }
        return ResponseEntity.noContent().build();
    }

    /** 409 rather than 404: the row is there, it is just not yours to change. */
    private void rejectHoliday(UUID id) {
        repository.findById(id)
                .filter(event -> event.kind() == EventKind.HOLIDAY)
                .ifPresent(event -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "holidays are read-only");
                });
    }

    private String requireTitle(CalendarEventRequest request) {
        String title = request.title() == null ? "" : request.title().trim();
        if (title.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "title is required");
        }
        return title;
    }

    private LocalDate requireDate(CalendarEventRequest request) {
        if (request.date() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "date is required");
        }
        return request.date();
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
