package com.example.retrieval_search.repository;

import com.example.retrieval_search.domain.DocumentSection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class DocumentSectionRepository {

    private final JdbcTemplate jdbc;

    public DocumentSectionRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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
