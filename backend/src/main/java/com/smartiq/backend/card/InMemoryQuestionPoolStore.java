package com.smartiq.backend.card;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Primary
public class InMemoryQuestionPoolStore implements QuestionPoolStore {

    private final Cache<QuestionPoolKey, ConcurrentLinkedQueue<CardResponse>> queueCache =
            Caffeine.newBuilder().expireAfterAccess(2, TimeUnit.HOURS).maximumSize(5000).build();

    private final Map<QuestionPoolKey, KeyCounters> counters = new ConcurrentHashMap<>();

    @Override
    public ConcurrentLinkedQueue<CardResponse> queueForKey(QuestionPoolKey key) {
        counters.computeIfAbsent(key, ignored -> new KeyCounters());
        return queueCache.get(key, ignored -> new ConcurrentLinkedQueue<>());
    }

    @Override
    public void recordCacheHit(QuestionPoolKey key) {
        counters.computeIfAbsent(key, ignored -> new KeyCounters()).cacheHits.incrementAndGet();
    }

    @Override
    public void recordCacheMiss(QuestionPoolKey key) {
        counters.computeIfAbsent(key, ignored -> new KeyCounters()).cacheMisses.incrementAndGet();
    }

    @Override
    public void recordRefill(QuestionPoolKey key, int added) {
        KeyCounters keyCounters = counters.computeIfAbsent(key, ignored -> new KeyCounters());
        keyCounters.refillCount.incrementAndGet();
        keyCounters.lastRefillAt = Instant.now();
    }

    @Override
    public void recordFallbackDbHit(QuestionPoolKey key) {
        counters.computeIfAbsent(key, ignored -> new KeyCounters()).fallbackDbHits.incrementAndGet();
    }

    @Override
    public List<PoolKeyStats> snapshot() {
        List<PoolKeyStats> stats = new ArrayList<>();
        for (Map.Entry<QuestionPoolKey, KeyCounters> entry : counters.entrySet()) {
            QuestionPoolKey key = entry.getKey();
            KeyCounters value = entry.getValue();
            long hits = value.cacheHits.get();
            long misses = value.cacheMisses.get();
            double hitRate = (hits + misses) == 0 ? 0.0 : (double) hits / (hits + misses);

            stats.add(new PoolKeyStats(
                    key.topic(),
                    key.difficulty(),
                    key.language(),
                    queueForKey(key).size(),
                    value.refillCount.get(),
                    value.lastRefillAt,
                    value.fallbackDbHits.get(),
                    hits,
                    misses,
                    hitRate
            ));
        }

        stats.sort(Comparator.comparing(PoolKeyStats::topic)
                .thenComparing(PoolKeyStats::difficulty)
                .thenComparing(PoolKeyStats::language));
        return stats;
    }

    private static class KeyCounters {
        private final AtomicLong refillCount = new AtomicLong();
        private final AtomicLong fallbackDbHits = new AtomicLong();
        private final AtomicLong cacheHits = new AtomicLong();
        private final AtomicLong cacheMisses = new AtomicLong();
        private volatile Instant lastRefillAt;
    }
}