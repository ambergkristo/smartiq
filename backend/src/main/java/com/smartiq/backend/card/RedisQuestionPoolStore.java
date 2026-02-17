package com.smartiq.backend.card;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

@Component
@Profile("redis-store")
public class RedisQuestionPoolStore implements QuestionPoolStore {

    @Override
    public ConcurrentLinkedQueue<CardResponse> queueForKey(QuestionPoolKey key) {
        throw new UnsupportedOperationException("RedisQuestionPoolStore is a placeholder for future implementation.");
    }

    @Override
    public void recordCacheHit(QuestionPoolKey key) {
    }

    @Override
    public void recordCacheMiss(QuestionPoolKey key) {
    }

    @Override
    public void recordRefill(QuestionPoolKey key, int added) {
    }

    @Override
    public void recordFallbackDbHit(QuestionPoolKey key) {
    }

    @Override
    public List<PoolKeyStats> snapshot() {
        return Collections.emptyList();
    }
}