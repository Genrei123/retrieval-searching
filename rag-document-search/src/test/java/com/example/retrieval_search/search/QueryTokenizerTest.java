package com.example.retrieval_search.search;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class QueryTokenizerTest {
    private final QueryTokenizer tokenizer = new QueryTokenizer();

    @Test
    void conversationalQuestionsKeepSearchableConcepts() {
        assertThat(tokenizer.retrievalQuery("Can you please explain connection pooling?"))
                .isEqualTo("connection pooling");
        assertThat(tokenizer.retrievalQuery("How do we use caching?" )).isEqualTo("caching");
    }

    @Test
    void preservesExplicitSearchSyntaxAndLiteralTerms() {
        for (String query : new String[]{"how \"connection pool\" works", "how caching -redis", "spring OR java", "spring web"}) {
            assertThat(tokenizer.retrievalQuery(query)).isEqualTo(query);
        }
    }

    @Test
    void preservesUnicodeAndDoesNotCreateEmptyQuery() {
        assertThat(tokenizer.candidates("CAFÉ 資料")).contains("café", "資料");
        assertThat(tokenizer.retrievalQuery("How do we?")).isEqualTo("How do we?");
    }
}
