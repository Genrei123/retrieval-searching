package com.example.retrieval_search.generation;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.function.Supplier;
import java.util.function.LongSupplier;

/** Process-local completed answers, shared by JSON and SSE requests. Never stores partial output. */
@Component
public class AnswerCache {
    public record CorpusChanged() {}
    public record Key(String question, int topK, UUID documentId, String mode) {}
    public record Result(GenerationService.RagOutcome outcome, boolean cached) {}
    private record VersionedKey(Key key, long revision) {}
    private record Entry(GenerationService.RagOutcome outcome, long createdAt) {}

    private final Map<Key, Entry> entries = new LinkedHashMap<>(16, 0.75f, true);
    private final Map<VersionedKey, CompletableFuture<GenerationService.RagOutcome>> pending = new HashMap<>();
    private final int maxEntries;
    private final long ttlNanos;
    private final LongSupplier ticker;
    private long revision;

    @Autowired
    public AnswerCache(@Value("${app.answer-cache.max-entries:256}") int maxEntries,
                       @Value("${app.answer-cache.ttl:PT30M}") Duration ttl) {
        this(maxEntries, ttl, System::nanoTime);
    }

    AnswerCache(int maxEntries, Duration ttl, LongSupplier ticker) {
        this.maxEntries = Math.max(0, maxEntries);
        this.ttlNanos = Math.max(0, ttl.toNanos());
        this.ticker = ticker;
    }

    @TransactionalEventListener(fallbackExecution = true)
    public synchronized void invalidate(CorpusChanged event) {
        revision++;
        entries.clear();
    }

    public Result getOrGenerate(Key key, Supplier<GenerationService.RagOutcome> generate) {
        CompletableFuture<GenerationService.RagOutcome> future;
        VersionedKey versioned;
        boolean owner;
        synchronized (this) {
            long now = ticker.getAsLong();
            entries.values().removeIf(e -> now - e.createdAt() >= ttlNanos);
            Entry entry = entries.get(key);
            if (entry != null) return new Result(entry.outcome(), true);
            versioned = new VersionedKey(key, revision);
            future = pending.get(versioned);
            owner = future == null;
            if (owner) {
                future = new CompletableFuture<>();
                pending.put(versioned, future);
            }
        }
        if (!owner) {
            try {
                return new Result(future.join(), true);
            } catch (CompletionException e) {
                if (e.getCause() instanceof RuntimeException cause) throw cause;
                throw e;
            }
        }
        try {
            var outcome = generate.get();
            synchronized (this) {
                if (revision == versioned.revision() && maxEntries > 0 && ttlNanos > 0
                        && !outcome.text().isBlank()) {
                    entries.put(key, new Entry(outcome, ticker.getAsLong()));
                    while (entries.size() > maxEntries) entries.remove(entries.keySet().iterator().next());
                }
            }
            future.complete(outcome);
            return new Result(outcome, false);
        } catch (RuntimeException | Error e) {
            future.completeExceptionally(e);
            throw e;
        } finally {
            synchronized (this) { pending.remove(versioned); }
        }
    }
}
