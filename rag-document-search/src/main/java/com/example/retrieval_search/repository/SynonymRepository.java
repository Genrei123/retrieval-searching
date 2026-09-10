package com.example.retrieval_search.repository;

import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public class SynonymRepository {

    private static final int MAX_EXPANSIONS = 10;

    private final NamedParameterJdbcTemplate jdbc;

    public SynonymRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Looks up synonym expansions for either the whole normalized query or any of its tokens (spec §5.2). */
    public List<String> findExpansions(Set<String> candidateTerms) {
        if (candidateTerms.isEmpty()) {
            return List.of();
        }
        MapSqlParameterSource params = new MapSqlParameterSource("terms", candidateTerms);
        return jdbc.queryForList(
                """
                SELECT DISTINCT expansion FROM search_synonyms
                WHERE enabled = true AND lower(term) IN (:terms)
                ORDER BY expansion
                LIMIT %d
                """.formatted(MAX_EXPANSIONS),
                params, String.class);
    }
}
