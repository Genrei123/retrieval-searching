package com.example.retrieval_search.search;

import com.example.retrieval_search.domain.MatchType;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Ranking per spec §6: ts_rank_cd base score, heading exact-match x1.5, synonym-only x0.6,
 * 0.01 score floor, max 3 sections per document. ts_headline (§7) runs only on the already
 * paginated `paged` CTE, never on the full candidate set.
 */
@Repository
public class SearchQueryRepository {

    private static final String SNIPPET_OPTS =
            "StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=20, MaxFragments=2, FragmentDelimiter= … ";

    private final NamedParameterJdbcTemplate jdbc;

    public SearchQueryRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<SearchHit> search(String rawQuery, List<String> expansions, int page, int size, UUID documentId) {
        boolean hasExpansions = !expansions.isEmpty();

        String queryCte = hasExpansions
                ? """
                  q AS (
                    SELECT websearch_to_tsquery('english', :rawQuery) AS base_query,
                           websearch_to_tsquery('english', :rawQuery)
                             || to_tsquery('english', :expansionExpr) AS full_query
                  )
                  """
                : """
                  q AS (
                    SELECT websearch_to_tsquery('english', :rawQuery) AS base_query,
                           websearch_to_tsquery('english', :rawQuery) AS full_query
                  )
                  """;

        String documentFilter = documentId != null ? "AND s.document_id = :documentId" : "";

        String sql = """
                WITH %s,
                candidates AS (
                    SELECT s.id, s.document_id, s.heading_path, s.body, s.anchor,
                           ts_rank_cd(s.search_vector, q.full_query, 32)
                             * CASE WHEN s.heading_path ILIKE ('%%' || :rawQuery || '%%') THEN 1.5 ELSE 1 END
                             * CASE WHEN NOT (s.search_vector @@ q.base_query) THEN 0.6 ELSE 1 END AS score,
                           CASE WHEN s.search_vector @@ q.base_query THEN 'EXACT' ELSE 'SYNONYM' END AS match_type
                    FROM document_sections s, q
                    WHERE s.search_vector @@ q.full_query
                    %s
                ),
                ranked AS (
                    SELECT *, ROW_NUMBER() OVER (PARTITION BY document_id ORDER BY score DESC) AS doc_rank
                    FROM candidates
                    WHERE score >= 0.01
                ),
                filtered AS (
                    SELECT *, COUNT(*) OVER() AS total_count
                    FROM ranked
                    WHERE doc_rank <= 3
                ),
                paged AS (
                    SELECT * FROM filtered ORDER BY score DESC, id LIMIT :size OFFSET :offset
                )
                SELECT p.*, d.title AS document_title,
                       ts_headline('english', p.body, q.full_query, :snippetOpts) AS snippet
                FROM paged p
                JOIN documents d ON d.id = p.document_id
                CROSS JOIN q
                ORDER BY p.score DESC, p.id
                """.formatted(queryCte, documentFilter);

        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("rawQuery", rawQuery)
                .addValue("size", size)
                .addValue("offset", page * size)
                .addValue("snippetOpts", SNIPPET_OPTS);
        if (hasExpansions) {
            params.addValue("expansionExpr", String.join(" | ", expansions));
        }
        if (documentId != null) {
            params.addValue("documentId", documentId);
        }

        return jdbc.query(sql, params, (rs, rowNum) -> new SearchHit(
                UUID.fromString(rs.getString("id")),
                UUID.fromString(rs.getString("document_id")),
                rs.getString("document_title"),
                rs.getString("heading_path"),
                rs.getString("anchor"),
                rs.getString("snippet"),
                rs.getDouble("score"),
                MatchType.valueOf(rs.getString("match_type")),
                rs.getLong("total_count")
        ));
    }
}
