package com.example.retrieval_search.generation;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

class AnswerCacheTest {
    private final AnswerCache cache = new AnswerCache(2, Duration.ofMinutes(30));
    private final AtomicInteger generations = new AtomicInteger();

    private AnswerCache.Key key(String question) {
        return new AnswerCache.Key(question, 8, null, "answer");
    }

    private GenerationService.RagOutcome generate() {
        return new GenerationService.RagOutcome("Question?", "Answer " + generations.incrementAndGet(), List.of());
    }

    @Test
    void secondAndSubsequentExactRequestsReplayFirstAnswer() {
        var first = cache.getOrGenerate(key("Question?"), this::generate);
        var second = cache.getOrGenerate(key("Question?"), this::generate);
        var third = cache.getOrGenerate(key("Question?"), this::generate);
        assertThat(first.cached()).isFalse();
        assertThat(second.cached()).isTrue();
        assertThat(third.outcome()).isEqualTo(first.outcome());
        assertThat(generations).hasValue(1);
    }

    @Test
    void exactTextScopeTopKAndModeAreSeparate() {
        var large = new AnswerCache(20, Duration.ofMinutes(30));
        for (var key : List.of(key("Question?"), key("question?"), key("Question"), key(" Question?"),
                new AnswerCache.Key("Question?", 3, null, "answer"),
                new AnswerCache.Key("Question?", 8, UUID.randomUUID(), "answer"),
                new AnswerCache.Key("Question?", 8, null, "topic"))) {
            assertThat(large.getOrGenerate(key, this::generate).cached()).isFalse();
        }
        assertThat(generations).hasValue(7);
    }

    @Test
    void evictsLeastRecentlyUsedAnswers() {
        cache.getOrGenerate(key("a"), this::generate);
        cache.getOrGenerate(key("b"), this::generate);
        cache.getOrGenerate(key("a"), this::generate);
        cache.getOrGenerate(key("c"), this::generate);
        assertThat(cache.getOrGenerate(key("a"), this::generate).cached()).isTrue();
        assertThat(cache.getOrGenerate(key("b"), this::generate).cached()).isFalse();
    }

    @Test
    void invalidationAlsoPreventsAnOldInFlightAnswerBeingStored() {
        cache.getOrGenerate(key("old"), this::generate);
        cache.getOrGenerate(key("running"), () -> {
            cache.invalidate(new AnswerCache.CorpusChanged());
            return generate();
        });
        assertThat(cache.getOrGenerate(key("old"), this::generate).cached()).isFalse();
        assertThat(cache.getOrGenerate(key("running"), this::generate).cached()).isFalse();
    }

    @Test
    void failedAndBlankAnswersAreNotCached() {
        assertThatThrownBy(() -> cache.getOrGenerate(key("a"), () -> {
            throw new IllegalStateException("Model failed");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(cache.getOrGenerate(key("a"), this::generate).cached()).isFalse();
        cache.getOrGenerate(key("b"), () -> new GenerationService.RagOutcome("b", " ", List.of()));
        assertThat(cache.getOrGenerate(key("b"), this::generate).cached()).isFalse();
    }

    @Test
    void expiresFromCompletionTimeEvenWhenFrequentlyRead() {
        var clock = new java.util.concurrent.atomic.AtomicLong();
        var shortLived = new AnswerCache(2, Duration.ofNanos(10), clock::get);
        shortLived.getOrGenerate(key("a"), this::generate);
        clock.set(9);
        assertThat(shortLived.getOrGenerate(key("a"), this::generate).cached()).isTrue();
        clock.set(10);
        assertThat(shortLived.getOrGenerate(key("a"), this::generate).cached()).isFalse();
    }

    @Test
    void zeroTtlDisablesRetention() {
        var disabled = new AnswerCache(2, Duration.ZERO);
        disabled.getOrGenerate(key("a"), this::generate);
        assertThat(disabled.getOrGenerate(key("a"), this::generate).cached()).isFalse();
    }

    @Test
    void concurrentRepeatsShareOneGeneration() throws Exception {
        var entered = new CountDownLatch(1);
        var release = new CountDownLatch(1);
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> cache.getOrGenerate(key("a"), () -> {
                entered.countDown();
                try {
                    if (!release.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timed out");
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(e);
                }
                return generate();
            }));
            assertThat(entered.await(5, TimeUnit.SECONDS)).isTrue();
            var second = executor.submit(() -> cache.getOrGenerate(key("a"), this::generate));
            release.countDown();
            assertThat(second.get(5, TimeUnit.SECONDS).outcome()).isEqualTo(first.get(5, TimeUnit.SECONDS).outcome());
            assertThat(generations).hasValue(1);
        }
    }
}
