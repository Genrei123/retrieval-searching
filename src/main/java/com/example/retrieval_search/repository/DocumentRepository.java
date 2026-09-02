package com.example.retrieval_search.repository;

import com.example.retrieval_search.domain.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class DocumentRepository {

    private static final RowMapper<Document> MAPPER = (rs, rowNum) -> new Document(
            UUID.fromString(rs.getString("id")),
            rs.getString("title"),
            rs.getString("source_uri"),
            rs.getString("content_type"),
            rs.getString("version"),
            rs.getTimestamp("ingested_at").toInstant(),
            rs.getString("checksum")
    );

    private final JdbcTemplate jdbc;

    public DocumentRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<Document> findAll() {
        return jdbc.query("SELECT * FROM documents ORDER BY ingested_at DESC", MAPPER);
    }

    public Optional<Document> findByTitle(String title) {
        List<Document> results = jdbc.query(
                "SELECT * FROM documents WHERE title = ?", MAPPER, title);
        return results.stream().findFirst();
    }

    public Optional<Document> findById(UUID id) {
        List<Document> results = jdbc.query(
                "SELECT * FROM documents WHERE id = ?", MAPPER, id);
        return results.stream().findFirst();
    }

    public boolean deleteById(UUID id) {
        int deleted = jdbc.update("DELETE FROM documents WHERE id = ?", id);
        return deleted > 0;
    }

    public void upsert(Document document) {
        int updated = jdbc.update(
                """
                UPDATE documents SET source_uri = ?, content_type = ?, version = ?,
                    ingested_at = ?, checksum = ? WHERE id = ?
                """,
                document.sourceUri(), document.contentType(), document.version(),
                Timestamp.from(document.ingestedAt()), document.checksum(), document.id());
        if (updated == 0) {
            jdbc.update(
                    """
                    INSERT INTO documents (id, title, source_uri, content_type, version, ingested_at, checksum)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    document.id(), document.title(), document.sourceUri(), document.contentType(),
                    document.version(), Timestamp.from(document.ingestedAt()), document.checksum());
        }
    }
}
