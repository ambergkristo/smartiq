package com.smartiq.backend.card;

import java.time.Instant;

public record PoolKeyStats(
        String topic,
        String difficulty,
        String language,
        int poolSize,
        long refillCount,
        Instant lastRefillAt,
        long fallbackDbHits,
        long cacheHits,
        long cacheMisses,
        double cacheHitRate
) {
}