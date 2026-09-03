-- Keeps the file exactly as it was uploaded, alongside the extracted sections that are indexed.
-- Ingestion only ever stored extracted text, so a document could be searched but never read in
-- its original form. Documents ingested before this migration have no row here.
CREATE TABLE document_files (
    document_id UUID PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    filename    TEXT,
    media_type  TEXT NOT NULL,
    byte_size   BIGINT NOT NULL,
    content     BYTEA NOT NULL
);
