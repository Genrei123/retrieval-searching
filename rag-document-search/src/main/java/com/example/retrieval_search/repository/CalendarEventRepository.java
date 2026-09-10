package com.example.retrieval_search.repository;

import com.example.retrieval_search.domain.CalendarEvent;
import com.example.retrieval_search.domain.EventKind;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Time;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class CalendarEventRepository {

    /** Day first, then timed entries in clock order with all-day ones ahead of them. */
    private static final String ORDER = " ORDER BY event_date, start_time NULLS FIRST, title ";

    private static final RowMapper<CalendarEvent> MAPPER = (rs, rowNum) -> {
        Time startTime = rs.getTime("start_time");
        return new CalendarEvent(
                rs.getObject("id", UUID.class),
                rs.getObject("event_date", LocalDate.class),
                startTime == null ? null : startTime.toLocalTime(),
                rs.getString("title"),
                rs.getString("notes"),
                EventKind.valueOf(rs.getString("kind")),
                rs.getTimestamp("created_at").toInstant());
    };

    private final NamedParameterJdbcTemplate jdbc;

    public CalendarEventRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Everything in a closed date range — the month the calendar is showing, or the week ahead. */
    public List<CalendarEvent> findBetween(LocalDate from, LocalDate to) {
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("from", from)
                .addValue("to", to);
        return jdbc.query(
                "SELECT * FROM calendar_events WHERE event_date BETWEEN :from AND :to" + ORDER,
                params, MAPPER);
    }

    public Optional<CalendarEvent> findById(UUID id) {
        List<CalendarEvent> found = jdbc.query(
                "SELECT * FROM calendar_events WHERE id = :id",
                new MapSqlParameterSource("id", id), MAPPER);
        return found.stream().findFirst();
    }

    public CalendarEvent insert(LocalDate date, LocalTime startTime, String title, String notes) {
        UUID id = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO calendar_events (id, event_date, start_time, title, notes, kind)
                VALUES (:id, :date, :startTime, :title, :notes, 'PERSONAL')
                """,
                params(date, startTime, title, notes).addValue("id", id));
        return findById(id).orElseThrow();
    }

    /** Returns empty when the id does not exist, so the caller can answer 404. */
    public Optional<CalendarEvent> update(UUID id, LocalDate date, LocalTime startTime, String title, String notes) {
        int rows = jdbc.update(
                """
                UPDATE calendar_events
                   SET event_date = :date, start_time = :startTime, title = :title, notes = :notes
                 WHERE id = :id AND kind = 'PERSONAL'
                """,
                params(date, startTime, title, notes).addValue("id", id));
        return rows == 0 ? Optional.empty() : findById(id);
    }

    public boolean delete(UUID id) {
        return jdbc.update(
                "DELETE FROM calendar_events WHERE id = :id AND kind = 'PERSONAL'",
                new MapSqlParameterSource("id", id)) > 0;
    }

    /** Null times and notes have to be typed, or the driver cannot infer the column type. */
    private MapSqlParameterSource params(LocalDate date, LocalTime startTime, String title, String notes) {
        return new MapSqlParameterSource()
                .addValue("date", date)
                .addValue("startTime", startTime == null ? null : Time.valueOf(startTime), Types.TIME)
                .addValue("title", title)
                .addValue("notes", notes, Types.VARCHAR);
    }
}
