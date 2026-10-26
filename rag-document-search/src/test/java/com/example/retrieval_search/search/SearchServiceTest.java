package com.example.retrieval_search.search;

import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.repository.SynonymRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class SearchServiceTest {
    private final SearchQueryRepository queries = mock(SearchQueryRepository.class);
    private final SynonymRepository synonyms = mock(SynonymRepository.class);
    private final DocumentRepository documents = mock(DocumentRepository.class);
    private final SearchService service = new SearchService(queries, synonyms, documents, new QueryTokenizer());

    @Test
    void stripsQuestionFramingButReturnsTheOriginalQuestion() {
        when(synonyms.findExpansions(anySet())).thenReturn(List.of("hikari"));
        when(queries.search(anyString(), anyList(), anyInt(), anyInt(), isNull())).thenReturn(List.of());
        var result = service.search("Can you explain connection pooling?", 0, 8, null);
        verify(queries).search("connection pooling", List.of("hikari"), 0, 8, null);
        assertThat(result.query()).isEqualTo("Can you explain connection pooling?");
    }

    @Test
    void expansionsCannotOverrideExplicitSearchOperators() {
        when(queries.search(anyString(), anyList(), anyInt(), anyInt(), isNull())).thenReturn(List.of());
        service.search("caching -redis", 0, 8, null);
        service.search("\"connection pool\"", 0, 8, null);
        verifyNoInteractions(synonyms);
        verify(queries).search("caching -redis", List.of(), 0, 8, null);
        verify(queries).search("\"connection pool\"", List.of(), 0, 8, null);
    }
}
