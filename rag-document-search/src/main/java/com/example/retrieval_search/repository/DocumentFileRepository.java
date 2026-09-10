package com.example.retrieval_search.repository;

import com.example.retrieval_search.domain.DocumentFile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class DocumentFileRepository {

    private static final RowMapper<DocumentFile> MAPPER = (rs, rowNum) -> new DocumentFile(
            UUID.fromString(rs.getString("document_id")),
            rs.getString("filename"),
            rs.getString("media_type"),
            rs.getLong("byte_size"),
            rs.getBytes("content"));

    /** Same shape without the bytes, so listing or describing a document never pulls a 25MB blob
     * through the connection. */
    private static final RowMapper<DocumentFile> INFO_MAPPER = (rs, rowNum) -> new DocumentFile(
            UUID.fromString(rs.getString("document_id")),
            rs.getString("filename"),
            rs.getString("media_type"),
            rs.getLong("byte_size"),
            null);

    private final JdbcTemplate jdbc;

    public DocumentFileRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<DocumentFile> findByDocumentId(UUID documentId) {
        List<DocumentFile> results = jdbc.query(
                "SELECT document_id, filename, media_type, byte_size, content FROM document_files WHERE document_id = ?",
                MAPPER, documentId);
        return results.stream().findFirst();
    }

    public Optional<DocumentFile> findInfoByDocumentId(UUID documentId) {
        List<DocumentFile> results = jdbc.query(
                "SELECT document_id, filename, media_type, byte_size FROM document_files WHERE document_id = ?",
                INFO_MAPPER, documentId);
        return results.stream().findFirst();
    }

    public boolean existsForDocument(UUID documentId) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM document_files WHERE document_id = ?", Integer.class, documentId);
        return count != null && count > 0;
    }

    public void upsert(DocumentFile file) {
        jdbc.update(
                """
                INSERT INTO document_files (document_id, filename, media_type, byte_size, content)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT (document_id) DO UPDATE
                    SET filename = EXCLUDED.filename,
                        media_type = EXCLUDED.media_type,
                        byte_size = EXCLUDED.byte_size,
                        content = EXCLUDED.content
                """,
                file.documentId(), file.filename(), file.mediaType(), file.byteSize(), file.content());
    }
}
