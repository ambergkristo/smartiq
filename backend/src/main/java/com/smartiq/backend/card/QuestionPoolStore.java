package com.smartiq.backend.card;

import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

public interface QuestionPoolStore {
    ConcurrentLinkedQueue<CardResponse> queueForKey(QuestionPoolKey key);

    void recordCacheHit(QuestionPoolKey key);

    void recordCacheMiss(QuestionPoolKey key);

    void recordRefill(QuestionPoolKey key, int added);

    void recordFallbackDbHit(QuestionPoolKey key);

    List<PoolKeyStats> snapshot();
}