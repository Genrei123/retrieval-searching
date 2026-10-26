package com.example.retrieval_search.generation;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnswerCacheTransactionTest {
    @Test
    void invalidatesOnlyAfterSuccessfulCommitAndImmediatelyForAutocommitWrites() {
        try (var context = new AnnotationConfigApplicationContext(Config.class)) {
            var cache = context.getBean(AnswerCache.class);
            var tx = new TransactionTemplate(context.getBean(TestTransactions.class));
            var key = new AnswerCache.Key("question", 8, null, "answer");
            var answer = new GenerationService.RagOutcome("question", "answer", List.of());
            cache.getOrGenerate(key, () -> answer);
            tx.executeWithoutResult(status -> {
                context.publishEvent(new AnswerCache.CorpusChanged());
                assertThat(cache.getOrGenerate(key, () -> answer).cached()).isTrue();
                status.setRollbackOnly();
            });
            assertThat(cache.getOrGenerate(key, () -> answer).cached()).isTrue();
            tx.executeWithoutResult(status -> {
                context.publishEvent(new AnswerCache.CorpusChanged());
                assertThat(cache.getOrGenerate(key, () -> answer).cached()).isTrue();
            });
            assertThat(cache.getOrGenerate(key, () -> answer).cached()).isFalse();
            context.publishEvent(new AnswerCache.CorpusChanged());
            assertThat(cache.getOrGenerate(key, () -> answer).cached()).isFalse();
        }
    }

    @Configuration
    @EnableTransactionManagement
    static class Config {
        @Bean AnswerCache cache() { return new AnswerCache(2, Duration.ofMinutes(30)); }
        @Bean TestTransactions transactions() { return new TestTransactions(); }
    }

    static class TestTransactions extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object transaction, TransactionDefinition definition) {}
        @Override protected void doCommit(DefaultTransactionStatus status) {}
        @Override protected void doRollback(DefaultTransactionStatus status) {}
    }
}
