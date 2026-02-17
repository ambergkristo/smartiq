package com.smartiq.backend.card;

import com.smartiq.backend.config.QuestionPoolProperties;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tag;
import io.micrometer.core.instrument.Tags;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

@Service
public class QuestionPoolService {

    private static final Logger log = LoggerFactory.getLogger(QuestionPoolService.class);

    private final CardRepository cardRepository;
    private final SessionCardTrackerService sessionCardTrackerService;
    private final QuestionPoolProperties properties;
    private final QuestionPoolStore poolStore;
    private final MeterRegistry meterRegistry;
    private final Set<QuestionPoolKey> refillInFlight = ConcurrentHashMap.newKeySet();
    private final Set<QuestionPoolKey> registeredMeters = ConcurrentHashMap.newKeySet();

    public QuestionPoolService(CardRepository cardRepository,
                               SessionCardTrackerService sessionCardTrackerService,
                               QuestionPoolProperties properties,
                               QuestionPoolStore poolStore,
                               MeterRegistry meterRegistry) {
        this.cardRepository = cardRepository;
        this.sessionCardTrackerService = sessionCardTrackerService;
        this.properties = properties;
        this.poolStore = poolStore;
        this.meterRegistry = meterRegistry;
    }

    @PostConstruct
    void warmup() {
        if (!properties.enabled()) {
            log.info("Question pool disabled by configuration.");
            return;
        }

        for (QuestionPoolKeyView keyView : cardRepository.findAllPoolKeys()) {
            QuestionPoolKey key = QuestionPoolKey.from(keyView.getTopic(), keyView.getDifficulty(), keyView.getLanguage());
            registerMetersIfNeeded(key);
            refillPool(key);
        }
    }

    public CardResponse nextCard(String topic, String difficulty, String language, String sessionId) {
        Set<String> servedIds = sessionCardTrackerService.servedIdsForSession(sessionId);
        QuestionPoolKey key = QuestionPoolKey.from(topic, difficulty, language);
        registerMetersIfNeeded(key);

        if (!properties.enabled() || isBlank(topic) || isBlank(difficulty)) {
            return fallbackWithReservation(topic, difficulty, language, sessionId, servedIds, key);
        }

        ConcurrentLinkedQueue<CardResponse> queue = poolStore.queueForKey(key);
        CardResponse fromPool = pullNonDuplicateAndReserve(queue, servedIds, sessionId, key);

        if (queue.size() < properties.lowWatermarkPerKey()) {
            asyncRefill(key);
        }

        if (fromPool != null) {
            poolStore.recordCacheHit(key);
            meterRegistry.counter("smartiq.pool.cache.hits", metricTags(key)).increment();
            return fromPool;
        }

        poolStore.recordCacheMiss(key);
        meterRegistry.counter("smartiq.pool.cache.misses", metricTags(key)).increment();
        log.warn("Question pool empty for key topic={} difficulty={} language={}; using DB fallback.",
                key.topic(), key.difficulty(), key.language());
        return fallbackWithReservation(topic, difficulty, language, sessionId, servedIds, key);
    }

    public List<PoolKeyStats> getPoolStats() {
        return poolStore.snapshot();
    }

    private CardResponse fallbackWithReservation(String topic,
                                                 String difficulty,
                                                 String language,
                                                 String sessionId,
                                                 Set<String> servedIds,
                                                 QuestionPoolKey key) {
        poolStore.recordFallbackDbHit(key);
        meterRegistry.counter("smartiq.pool.fallback.db.hits", metricTags(key)).increment();

        for (int i = 0; i < 5; i += 1) {
            CardResponse fallback = fallbackRandom(topic, difficulty, language, servedIds);
            if (sessionCardTrackerService.tryMarkServed(sessionId, fallback.id())) {
                return fallback;
            }
            servedIds = sessionCardTrackerService.servedIdsForSession(sessionId);
        }

        throw new NoSuchElementException("No non-duplicate cards available for session");
    }

    private CardResponse fallbackRandom(String topic, String difficulty, String language, Set<String> servedIds) {
        Optional<Card> maybeCard = servedIds.isEmpty()
                ? cardRepository.findRandomByFilters(
                normalizeOptional(topic),
                normalizeOptional(difficulty),
                normalizeOptional(language)
        )
                : cardRepository.findRandomByFiltersExcludingIds(
                normalizeOptional(topic),
                normalizeOptional(difficulty),
                normalizeOptional(language),
                servedIds
        );

        Card card = maybeCard.orElseThrow(() -> new NoSuchElementException("No cards available for requested filters"));
        return CardResponse.fromEntity(card);
    }

    private CardResponse pullNonDuplicateAndReserve(ConcurrentLinkedQueue<CardResponse> queue,
                                                    Set<String> servedIds,
                                                    String sessionId,
                                                    QuestionPoolKey key) {
        if (queue.isEmpty()) {
            return null;
        }

        List<CardResponse> skipped = new ArrayList<>();
        int attempts = queue.size();

        for (int i = 0; i < attempts; i += 1) {
            CardResponse candidate = queue.poll();
            if (candidate == null) {
                break;
            }

            if (servedIds.contains(candidate.id())) {
                skipped.add(candidate);
                continue;
            }

            if (sessionCardTrackerService.tryMarkServed(sessionId, candidate.id())) {
                skipped.forEach(queue::add);
                return candidate;
            }

            skipped.add(candidate);
            poolStore.recordCacheMiss(key);
            servedIds = sessionCardTrackerService.servedIdsForSession(sessionId);
        }

        skipped.forEach(queue::add);
        return null;
    }

    private void asyncRefill(QuestionPoolKey key) {
        if (!refillInFlight.add(key)) {
            return;
        }

        CompletableFuture.runAsync(() -> {
            try {
                refillPool(key);
            } finally {
                refillInFlight.remove(key);
            }
        });
    }

    private void refillPool(QuestionPoolKey key) {
        ConcurrentLinkedQueue<CardResponse> queue = poolStore.queueForKey(key);
        long bankSize = cardRepository.countByPoolKey(key.topic(), key.difficulty(), key.language());

        if (bankSize < properties.minimumPerKey()) {
            log.warn("bank_low topic={} difficulty={} language={} available={} required={}",
                    key.topic(), key.difficulty(), key.language(), bankSize, properties.minimumPerKey());
        }

        int refillTarget = (int) Math.min(bankSize, properties.refillTargetPerKey());
        if (refillTarget <= queue.size()) {
            return;
        }

        List<Card> cards = new ArrayList<>(cardRepository.findAllByPoolKey(key.topic(), key.difficulty(), key.language()));
        if (cards.isEmpty()) {
            return;
        }

        Collections.shuffle(cards);
        int added = 0;
        for (Card card : cards) {
            if (queue.size() >= refillTarget) {
                break;
            }
            queue.add(CardResponse.fromEntity(card));
            added += 1;
        }

        if (added > 0) {
            poolStore.recordRefill(key, added);
            meterRegistry.counter("smartiq.pool.refills", metricTags(key)).increment();
        }
    }

    private void registerMetersIfNeeded(QuestionPoolKey key) {
        if (!registeredMeters.add(key)) {
            return;
        }

        Tags tags = Tags.of(
                "topic", safeTag(key.topic()),
                "difficulty", safeTag(key.difficulty()),
                "language", safeTag(key.language())
        );

        meterRegistry.gauge("smartiq.pool.size", tags, poolStore.queueForKey(key), ConcurrentLinkedQueue::size);
        meterRegistry.gauge("smartiq.pool.cache.hit.rate", tags, this,
                ignored -> poolStore.snapshot().stream()
                        .filter(stat -> key.topic().equals(stat.topic())
                                && key.difficulty().equals(stat.difficulty())
                                && key.language().equals(stat.language()))
                        .findFirst()
                        .map(PoolKeyStats::cacheHitRate)
                        .orElse(0.0));
    }

    private Iterable<Tag> metricTags(QuestionPoolKey key) {
        return Tags.of(
                "topic", safeTag(key.topic()),
                "difficulty", safeTag(key.difficulty()),
                "language", safeTag(key.language())
        );
    }

    private static String safeTag(String value) {
        return value == null ? "unknown" : value;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalizeOptional(String value) {
        return isBlank(value) ? null : value.trim().toLowerCase();
    }
}
