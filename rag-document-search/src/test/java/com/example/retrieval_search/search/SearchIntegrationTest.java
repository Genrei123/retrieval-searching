package com.example.retrieval_search.search;

import com.example.retrieval_search.domain.MatchType;
import com.example.retrieval_search.ingestion.IngestionService;
import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.repository.DocumentSectionRepository;
import com.example.retrieval_search.repository.DocumentFileRepository;
import com.example.retrieval_search.generation.GenerationService;
import com.example.retrieval_search.generation.OpenAiClient;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Locale;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

/**
 * Runs against a real, disposable PostgreSQL container (spec §9): tsvector, ts_rank_cd and
 * ts_headline are Postgres-specific and cannot be exercised against an in-memory database.
 * The corpus under src/test/resources/seed-docs is ingested by this test; the application
 * itself ships no sample data.
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

    @Autowired
    private IngestionService ingestionService;

    @Autowired private DocumentRepository documents;
    @MockitoSpyBean private DocumentSectionRepository sections;
    @Autowired private DocumentFileRepository files;
    @Autowired private GenerationService generation;
    @MockitoBean private OpenAiClient model;

    @Test
    void documentCrudReindexesAndInvalidatesAnswerMemory() {
        String title = "CRUD " + UUID.randomUUID();
        byte[] initial = ("# Galaxy\n" + "Galaxy caching stores reusable data. ".repeat(30)).getBytes(StandardCharsets.UTF_8);
        UUID id = ingestionService.ingest(title, null, "markdown", "1", "initial.md", initial).documentId();
        when(model.generate(anyString())).thenReturn("First answer", "Renamed answer", "Replacement answer");
        assertThat(generation.answerQuestion("caching", 8, id).text()).isEqualTo("First answer");
        assertThat(generation.answerQuestion("caching", 8, id).text()).isEqualTo("First answer");
        var initialSections = sections.findByDocumentId(id);

        ingestionService.update(id, title + " renamed", "dataset-reference", "2", null, null, null, ignored -> {});
        assertThat(documents.findById(id).orElseThrow().title()).isEqualTo(title + " renamed");
        assertThat(sections.findByDocumentId(id)).isEqualTo(initialSections);
        assertThat(files.findByDocumentId(id).orElseThrow().content()).isEqualTo(initial);
        assertThat(generation.answerQuestion("caching", 8, id).text()).isEqualTo("Renamed answer");

        byte[] replacement = ("# Planet\n" + "Planet caching refreshes saved data. ".repeat(30)).getBytes(StandardCharsets.UTF_8);
        ingestionService.update(id, title + " renamed", null, "3", "markdown", "replacement.md", replacement, ignored -> {});
        assertThat(searchService.search("galaxy", 0, 10, id).hits()).isEmpty();
        assertThat(searchService.search("planet", 0, 10, id).hits()).isNotEmpty();
        assertThat(files.findByDocumentId(id).orElseThrow().content()).isEqualTo(replacement);
        assertThat(generation.answerQuestion("caching", 8, id).text()).isEqualTo("Replacement answer");
        verify(model, times(3)).generate(anyString());

        assertThat(documents.deleteById(id)).isTrue();
        assertThat(sections.findByDocumentId(id)).isEmpty();
        assertThat(files.findByDocumentId(id)).isEmpty();
        assertThatThrownBy(() -> generation.answerQuestion("caching", 8, id)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void failureAfterDeletingOldSectionsRollsBackTheEntireReplacement() {
        String title = "Rollback " + UUID.randomUUID();
        byte[] initial = ("# Stable\n" + "Original searchable data. ".repeat(30)).getBytes(StandardCharsets.UTF_8);
        UUID id = ingestionService.ingest(title, null, "markdown", "1", "initial.md", initial).documentId();
        var previous = sections.findByDocumentId(id);
        doThrow(new IllegalStateException("Test insert failure")).when(sections).insertAll(anyList());
        try {
            assertThatThrownBy(() -> ingestionService.update(id, title, null, "2", "markdown", "replacement.md",
                    "Replacement data".getBytes(StandardCharsets.UTF_8), ignored -> {})).isInstanceOf(IllegalStateException.class);
        } finally {
            doCallRealMethod().when(sections).insertAll(anyList());
        }
        assertThat(sections.findByDocumentId(id)).isEqualTo(previous);
        assertThat(documents.findById(id).orElseThrow().version()).isEqualTo("1");
        assertThat(files.findByDocumentId(id).orElseThrow().content()).isEqualTo(initial);
        documents.deleteById(id);
    }

    /** Ingestion is checksum-idempotent, so re-running this between tests is a no-op. */
    @BeforeEach
    void ingestCorpus() throws Exception {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        for (Resource resource : resolver.getResources("classpath:seed-docs/*")) {
            String filename = resource.getFilename();
            if (filename == null) {
                continue;
            }
            String contentType = contentTypeOf(filename);
            if (contentType == null) {
                continue;
            }
            ingestionService.ingest(
                    titleOf(filename),
                    "classpath:seed-docs/" + filename,
                    contentType,
                    "test-1",
                    filename,
                    resource.getContentAsByteArray());
        }
    }

    private String contentTypeOf(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".md")) {
            return "markdown";
        }
        if (lower.endsWith(".pdf")) {
            return "pdf";
        }
        return null;
    }

    private String titleOf(String filename) {
        String base = filename.replaceAll("\\.(md|pdf)$", "");
        String[] words = base.split("-");
        StringBuilder title = new StringBuilder();
        for (String word : words) {
            if (title.length() > 0) {
                title.append(' ');
            }
            title.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
        }
        return title.toString();
    }

    @Test
    void conversationalQuestionFindsRelevantSectionsWithoutSynonyms() {
        SearchService.SearchOutcome outcome = searchService.search(
                "Can you please explain dependency injection?", 0, 10, null);
        assertThat(outcome.hits()).anySatisfy(hit ->
                assertThat(hit.headingPath()).contains("Dependency Injection"));
    }

    @Test
    void scopedSearchCanReadBeyondThreeSectionsAndPaginate() {
        var first = searchService.search("spring", 0, 10, null).hits().get(0);
        var scoped = searchService.search("spring", 0, 50, first.documentId());
        assertThat(scoped.hits()).hasSizeGreaterThan(3);
        var next = searchService.search("spring", 1, 3, first.documentId());
        assertThat(next.hits()).isNotEmpty();
        assertThat(next.totalResults()).isEqualTo(scoped.totalResults());
        assertThat(next.hits().get(0).sectionId()).isEqualTo(scoped.hits().get(3).sectionId());
    }

    @Test
    void directTermQueryRanksExactHeadingMatchFirst() {
        SearchService.SearchOutcome outcome = searchService.search("spring mvc", 0, 10, null);

        assertThat(outcome.hits()).isNotEmpty();
        SearchHit top = outcome.hits().get(0);
        assertThat(top.headingPath()).contains("Spring MVC");
        assertThat(top.matchType()).isEqualTo(MatchType.EXACT);
    }

    @Test
    void broadWebQueryFindsBothWebStacks() {
        var hits = searchService.search("spring web", 0, 10, null).hits();
        assertThat(hits).anySatisfy(hit -> assertThat(hit.headingPath()).contains("Spring MVC"));
        assertThat(hits).anySatisfy(hit -> assertThat(hit.headingPath()).contains("Spring WebFlux"));
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
