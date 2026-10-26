package com.example.retrieval_search.generation;

import com.example.retrieval_search.domain.DocumentSection;
import com.example.retrieval_search.domain.MatchType;
import com.example.retrieval_search.repository.DocumentSectionRepository;
import com.example.retrieval_search.search.SearchHit;
import com.example.retrieval_search.search.SearchService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class GenerationServiceTest {
    private final SearchService search = mock(SearchService.class);
    private final DocumentSectionRepository sections = mock(DocumentSectionRepository.class);
    private final OpenAiClient model = mock(OpenAiClient.class);
    private final AnswerCache cache = new AnswerCache(256, Duration.ofMinutes(30));
    private final GenerationService service = new GenerationService(search, sections, model, cache);
    private final String question = "How does caching work?";

    private SearchHit hit(String title) {
        return new SearchHit(UUID.randomUUID(), UUID.randomUUID(), title, "Caching", "cache", "snippet", 1, MatchType.EXACT, 1);
    }

    private DocumentSection section(SearchHit hit, String body) {
        return new DocumentSection(hit.sectionId(), hit.documentId(), 0, hit.headingPath(), body, hit.anchor());
    }

    private void retrieval(List<SearchHit> hits, List<DocumentSection> bodies) {
        when(search.search(question, 0, 8, null))
                .thenReturn(new SearchService.SearchOutcome(question, hits.size(), 0, 8, 0, hits));
        when(sections.findByIds(anyList())).thenReturn(bodies);
    }

    @Test
    void jsonAnswerIsReplayedToSseWithoutRetrievingOrGeneratingAgain() {
        var hit = hit("Guide");
        retrieval(List.of(hit), List.of(section(hit, "Caching saves repeated work.")));
        when(model.generate(anyString())).thenReturn("Caching saves work. [1]");
        var first = service.answerQuestion(question, 8, null);
        var sources = new ArrayList<SearchHit>();
        var tokens = new StringBuilder();
        assertThat(service.streamAnswer(question, 8, null, sources::addAll, tokens::append)).isTrue();
        assertThat(tokens.toString()).isEqualTo(first.text());
        assertThat(sources).containsExactly(hit);
        verify(search, times(1)).search(question, 0, 8, null);
        verify(model, times(1)).generate(anyString());
        verify(model, never()).generateStream(anyString(), any());
    }

    @Test
    void successfulStreamIsReplayedToJson() {
        var hit = hit("Guide");
        retrieval(List.of(hit), List.of(section(hit, "Cache data.")));
        doAnswer(invocation -> {
            Consumer<String> tokens = invocation.getArgument(1);
            tokens.accept("Cache");
            tokens.accept(" data. [1]");
            return null;
        }).when(model).generateStream(anyString(), any());
        assertThat(service.streamAnswer(question, 8, null, ignored -> {}, ignored -> {})).isFalse();
        assertThat(service.answerQuestion(question, 8, null).text()).isEqualTo("Cache data. [1]");
        verify(model, never()).generate(anyString());
        verify(search, times(1)).search(question, 0, 8, null);
    }

    @Test
    void failedPartialStreamIsRegenerated() {
        var hit = hit("Guide");
        retrieval(List.of(hit), List.of(section(hit, "Cache data.")));
        doAnswer(invocation -> {
            Consumer<String> tokens = invocation.getArgument(1);
            tokens.accept("Partial");
            throw new IllegalStateException("Disconnected");
        }).when(model).generateStream(anyString(), any());
        assertThatThrownBy(() -> service.streamAnswer(question, 8, null, ignored -> {}, ignored -> {}))
                .isInstanceOf(IllegalStateException.class);
        when(model.generate(anyString())).thenReturn("Complete answer");
        assertThat(service.answerQuestion(question, 8, null).text()).isEqualTo("Complete answer");
        verify(search, times(2)).search(question, 0, 8, null);
    }

    @Test
    void missingAndDuplicateSectionsDoNotProduceMisnumberedSources() {
        var missing = hit("Missing");
        var first = hit("First");
        var duplicate = hit("Duplicate");
        var second = hit("Second");
        retrieval(List.of(missing, first, duplicate, second), List.of(
                section(first, "Shared text"), section(duplicate, "Shared text"), section(second, "Other text")));
        when(model.generate(anyString())).thenReturn("Answer [1] [2]");
        assertThat(service.answerQuestion(question, 8, null).sources()).containsExactly(first, second);
        var prompt = ArgumentCaptor.forClass(String.class);
        verify(model).generate(prompt.capture());
        assertThat(prompt.getValue()).contains("[1] First / Caching", "[2] Second / Caching")
                .doesNotContain("Missing /", "Duplicate /");
    }

    @Test
    void noSourcesSkipsModelAndInvalidationAllowsNewDocuments() {
        retrieval(List.of(), List.of());
        assertThat(service.answerQuestion(question, 8, null).text()).isEqualTo("No relevant sections were found.");
        verifyNoInteractions(model, sections);
        cache.invalidate(new AnswerCache.CorpusChanged());
        var hit = hit("New guide");
        retrieval(List.of(hit), List.of(section(hit, "New data")));
        when(model.generate(anyString())).thenReturn("New answer");
        assertThat(service.answerQuestion(question, 8, null).text()).isEqualTo("New answer");
    }

    @Test
    void contextIsBoundedAndCitesOnlyIncludedSections() {
        var hits = java.util.stream.IntStream.range(0, 8).mapToObj(i -> hit("Guide " + i)).toList();
        retrieval(hits, hits.stream().map(h -> section(h, h.documentTitle() + "x".repeat(20_000))).toList());
        when(model.generate(anyString())).thenReturn("Answer");
        var result = service.answerQuestion(question, 8, null);
        var prompt = ArgumentCaptor.forClass(String.class);
        verify(model).generate(prompt.capture());
        assertThat(prompt.getValue()).hasSizeLessThan(14_000).contains("[excerpt truncated]");
        assertThat(result.sources()).hasSizeLessThan(8);
    }
}
