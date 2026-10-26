package com.example.retrieval_search.search;

import com.example.retrieval_search.repository.DocumentRepository;
import com.example.retrieval_search.repository.SynonymRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
public class SearchService {

    private final SearchQueryRepository searchQueryRepository;
    private final SynonymRepository synonymRepository;
    private final DocumentRepository documentRepository;
    private final QueryTokenizer tokenizer;

    public SearchService(SearchQueryRepository searchQueryRepository,
                          SynonymRepository synonymRepository,
                          DocumentRepository documentRepository,
                          QueryTokenizer tokenizer) {
        this.searchQueryRepository = searchQueryRepository;
        this.synonymRepository = synonymRepository;
        this.documentRepository = documentRepository;
        this.tokenizer = tokenizer;
    }

    public SearchOutcome search(String rawQuery, int page, int size, UUID documentId) {
        if (rawQuery == null || rawQuery.isBlank() || rawQuery.length() > 200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "q must be 1-200 characters");
        }
        if (documentId != null && documentRepository.findById(documentId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown documentId: " + documentId);
        }

        String trimmedQuery = rawQuery.trim();
        Set<String> candidates = tokenizer.candidates(trimmedQuery);
        // Expanding with OR would bypass a user's quoted phrase or excluded terms.
        List<String> expansions = tokenizer.hasSearchSyntax(trimmedQuery)
                ? List.of() : synonymRepository.findExpansions(candidates);

        long startNanos = System.nanoTime();
        page = Math.max(0, page);
        size = Math.min(50, Math.max(1, size));
        List<SearchHit> hits = searchQueryRepository.search(tokenizer.retrievalQuery(trimmedQuery), expansions, page, size, documentId);
        long tookMs = (System.nanoTime() - startNanos) / 1_000_000;

        long totalResults = hits.isEmpty() ? 0 : hits.get(0).totalCount();
        return new SearchOutcome(trimmedQuery, totalResults, page, size, tookMs, hits);
    }

    public record SearchOutcome(String query, long totalResults, int page, int size, long tookMs, List<SearchHit> hits) {
    }
}
