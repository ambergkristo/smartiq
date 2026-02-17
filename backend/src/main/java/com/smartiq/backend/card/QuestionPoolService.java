package com.smartiq.backend.card;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.smartiq.backend.config.QuestionPoolProperties;
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
import java.util.concurrent.TimeUnit;

@Service
public class QuestionPoolService {

    private static final Logger log = LoggerFactory.getLogger(QuestionPoolService.class);

    private final CardRepository cardRepository;
    private final SessionCardTrackerService sessionCardTrackerService;
    private final QuestionPoolProperties properties;
    private final Cache<QuestionPoolKey, ConcurrentLinkedQueue<CardResponse>> poolCache =
            Caffeine.newBuilder().expireAfterAccess(2, TimeUnit.HOURS).maximumSize(1000).build();
    private final Set<QuestionPoolKey> refillInFlight = ConcurrentHashMap.newKeySet();

    public QuestionPoolService(CardRepository cardRepository,
                               SessionCardTrackerService sessionCardTrackerService,
                               QuestionPoolProperties properties) {
        this.cardRepository = cardRepository;
        this.sessionCardTrackerService = sessionCardTrackerService;
        this.properties = properties;
    }

    @PostConstruct
    void warmup() {
        if (!properties.enabled()) {
            log.info("Question pool disabled by configuration.");
            return;
        }

        for (QuestionPoolKeyView keyView : cardRepository.findAllPoolKeys()) {
            QuestionPoolKey key = QuestionPoolKey.from(keyView.getTopic(), keyView.getDifficulty(), keyView.getLanguage());
            refillPool(key);
        }
    }

    public CardResponse nextCard(String topic, String difficulty, String language, String sessionId) {
        Set<String> servedIds = sessionCardTrackerService.servedIdsForSession(sessionId);

        if (!properties.enabled() || isBlank(topic) || isBlank(difficulty)) {
            CardResponse fallback = fallbackRandom(topic, difficulty, language, servedIds);
            sessionCardTrackerService.markServed(sessionId, fallback.id());
            return fallback;
        }

        QuestionPoolKey key = QuestionPoolKey.from(topic, difficulty, language);
        ConcurrentLinkedQueue<CardResponse> queue = poolCache.get(key, ignored -> new ConcurrentLinkedQueue<>());
        CardResponse fromPool = pullNonDuplicate(queue, servedIds);

        if (queue.size() < properties.lowWatermarkPerKey()) {
            asyncRefill(key);
        }

        if (fromPool != null) {
            sessionCardTrackerService.markServed(sessionId, fromPool.id());
            return fromPool;
        }

        log.warn("Question pool empty for key topic={} difficulty={} language={}; using DB fallback.",
                key.topic(), key.difficulty(), key.language());
        CardResponse fallback = fallbackRandom(topic, difficulty, language, servedIds);
        sessionCardTrackerService.markServed(sessionId, fallback.id());
        return fallback;
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

    private CardResponse pullNonDuplicate(ConcurrentLinkedQueue<CardResponse> queue, Set<String> servedIds) {
        if (queue.isEmpty()) {
            return null;
        }
        if (servedIds.isEmpty()) {
            return queue.poll();
        }

        List<CardResponse> skipped = new ArrayList<>();
        int attempts = queue.size();
        for (int i = 0; i < attempts; i += 1) {
            CardResponse candidate = queue.poll();
            if (candidate == null) {
                break;
            }
            if (!servedIds.contains(candidate.id())) {
                skipped.forEach(queue::add);
                return candidate;
            }
            skipped.add(candidate);
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
        ConcurrentLinkedQueue<CardResponse> queue = poolCache.get(key, ignored -> new ConcurrentLinkedQueue<>());
        long bankSize = cardRepository.countByPoolKey(key.topic(), key.difficulty(), key.language());

        if (bankSize < properties.minimumPerKey()) {
            log.warn("Insufficient bank for topic={} difficulty={} language={} available={} required={}",
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
        for (Card card : cards) {
            if (queue.size() >= refillTarget) {
                break;
            }
            queue.add(CardResponse.fromEntity(card));
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static String normalizeOptional(String value) {
        return isBlank(value) ? null : value.trim().toLowerCase();
    }
}
