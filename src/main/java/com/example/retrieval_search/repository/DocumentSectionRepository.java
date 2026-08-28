package com.example.retrieval_search.repository;

import com.example.retrieval_search.domain.DocumentSection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Repository
public class DocumentSectionRepository {

    private final JdbcTemplate jdbc;

    public DocumentSectionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<DocumentSection> findByIds(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        String placeholders = ids.stream().map(id -> "?").collect(Collectors.joining(","));
        return jdbc.query(
                "SELECT id, document_id, ordinal, heading_path, body, anchor FROM document_sections WHERE id IN (" + placeholders + ")",
                ids.toArray(),
                (rs, rowNum) -> new DocumentSection(
                        UUID.fromString(rs.getString("id")),
                        UUID.fromString(rs.getString("document_id")),
                        rs.getInt("ordinal"),
                        rs.getString("heading_path"),
                        rs.getString("body"),
                        rs.getString("anchor")));
    }

    public void deleteByDocumentId(UUID documentId) {
        jdbc.update("DELETE FROM document_sections WHERE document_id = ?", documentId);
    }

    public void insertAll(List<DocumentSection> sections) {
        jdbc.batchUpdate(
                """
                INSERT INTO document_sections (id, document_id, ordinal, heading_path, body, anchor)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                sections,
                sections.size(),
                (ps, section) -> {
                    ps.setObject(1, section.id());
                    ps.setObject(2, section.documentId());
                    ps.setInt(3, section.ordinal());
                    ps.setString(4, section.headingPath());
                    ps.setString(5, section.body());
                    ps.setString(6, section.anchor());
                });
    }
}
