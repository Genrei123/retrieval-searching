CREATE TABLE documents (
    id            UUID PRIMARY KEY,
    title         TEXT NOT NULL,
    source_uri    TEXT,
    content_type  TEXT NOT NULL,
    version       TEXT,
    ingested_at   TIMESTAMPTZ NOT NULL,
    checksum      TEXT NOT NULL
);

CREATE TABLE document_sections (
    id            UUID PRIMARY KEY,
    document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ordinal       INT NOT NULL,
    heading_path  TEXT,
    body          TEXT NOT NULL,
    anchor        TEXT,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(heading_path, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(body, '')), 'B')
    ) STORED,
    UNIQUE (document_id, ordinal)
);

CREATE INDEX idx_sections_fts ON document_sections USING GIN (search_vector);
CREATE INDEX idx_sections_doc ON document_sections (document_id);

CREATE TABLE search_synonyms (
    id         BIGSERIAL PRIMARY KEY,
    term       TEXT NOT NULL,
    expansion  TEXT NOT NULL,
    enabled    BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_synonyms_term ON search_synonyms (lower(term));
