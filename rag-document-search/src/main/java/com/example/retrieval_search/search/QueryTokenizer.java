package com.example.retrieval_search.search;

import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Component
public class QueryTokenizer {

    private static final Set<String> STOPWORDS = Set.of(
            "a", "an", "and", "are", "as", "at", "be", "by", "do", "does", "did",
            "for", "from", "how", "in", "is", "it", "of", "on", "or", "our",
            "that", "the", "this", "to", "use", "used", "using", "we", "what", "when", "where", "which", "who", "why");

    /**
     * Candidate terms for synonym lookup (spec §5.2): the whole normalized query, each
     * non-stopword unigram, and adjacent-token bigrams (unfiltered, so multi-word synonym
     * keys like "web app" still match even though "web" and "app(s)" survive stopword removal).
     */
    public Set<String> candidates(String rawQuery) {
        String normalized = normalize(rawQuery);
        Set<String> candidates = new LinkedHashSet<>();
        if (normalized.isEmpty()) {
            return candidates;
        }
        candidates.add(normalized);

        String[] tokens = normalized.split(" ");
        for (String token : tokens) {
            if (!STOPWORDS.contains(token)) {
                candidates.add(token);
            }
        }
        for (int i = 0; i < tokens.length - 1; i++) {
            candidates.add(tokens[i] + " " + tokens[i + 1]);
        }
        return candidates;
    }

    /** Remove question framing while preserving explicit web-search operators and phrases. */
    public String retrievalQuery(String rawQuery) {
        if (hasSearchSyntax(rawQuery)) {
            return rawQuery;
        }
        String normalized = normalize(rawQuery);
        if (!normalized.matches("^(what|how|why|when|where|which|who|can|could|please|explain|describe|tell)\\b.*")) {
            return rawQuery;
        }
        String terms = java.util.Arrays.stream(normalized.split(" "))
                .filter(token -> !STOPWORDS.contains(token))
                .filter(token -> !Set.of("can", "could", "please", "explain", "describe", "tell", "me", "about", "you").contains(token))
                .distinct().collect(java.util.stream.Collectors.joining(" "));
        return terms.isBlank() ? rawQuery : terms;
    }

    public boolean hasSearchSyntax(String query) {
        return query.contains("\"") || query.matches("(?s).*(?:^|\\s)-\\S+.*")
                || query.matches("(?is).*\\bor\\b.*");
    }

    private String normalize(String query) {
        return query.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}\\s]", " ")
                .trim().replaceAll("\\s+", " ");
    }
}
