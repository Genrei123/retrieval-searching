package com.example.retrieval_search.search;

import com.example.retrieval_search.domain.MatchType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against a real, disposable PostgreSQL container (spec §9): tsvector, ts_rank_cd and
 * ts_headline are Postgres-specific and cannot be exercised against an in-memory database.
 * The bundled seed-docs corpus is ingested automatically by SeedDataLoader on context startup.
 */
@SpringBootTest
@Testcontainers
class SearchIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private SearchService searchService;

    @Test
    void directTermQueryRanksExactHeadingMatchFirst() {
        SearchService.SearchOutcome outcome = searchService.search("spring web", 0, 10, null);

        assertThat(outcome.hits()).isNotEmpty();
        SearchHit top = outcome.hits().get(0);
        assertThat(top.headingPath()).contains("Spring MVC");
        assertThat(top.matchType()).isEqualTo(MatchType.EXACT);
    }

    @Test
    void descriptiveQueryMatchesSpringMvcOnlyViaSynonymExpansion() {
        SearchService.SearchOutcome outcome = searchService.search(
                "what do we use for web apps in spring", 0, 10, null);

        assertThat(outcome.hits())
                .anySatisfy(hit -> {
                    assertThat(hit.headingPath()).contains("Spring MVC");
                    assertThat(hit.matchType()).isEqualTo(MatchType.SYNONYM);
                });
    }

    @Test
    void pdfIngestedSectionsAreSearchableWithoutHeadingPath() {
        SearchService.SearchOutcome outcome = searchService.search("connection pool", 0, 10, null);

        assertThat(outcome.hits()).isNotEmpty();
        assertThat(outcome.hits().get(0).headingPath()).isNull();
    }

    @Test
    void resultsAreCappedAtThreeSectionsPerDocumentPerPage() {
        SearchService.SearchOutcome outcome = searchService.search("spring", 0, 50, null);

        outcome.hits().stream()
                .collect(java.util.stream.Collectors.groupingBy(SearchHit::documentId, java.util.stream.Collectors.counting()))
                .values()
                .forEach(count -> assertThat(count).isLessThanOrEqualTo(3L));
    }
}
