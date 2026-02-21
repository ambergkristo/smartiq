package com.smartiq.backend.card;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class NextRandomCardService {

    private static final Logger log = LoggerFactory.getLogger(NextRandomCardService.class);

    static final int LAST_K_DEFAULT = 20;
    private static final List<String> ALLOWED_SOURCES = List.of(
            "smartiq-v2",
            "smartiq-human",
            "smartiq-verified"
    );
    private static final int MAX_TRACKED_GAMES = 10_000;
    private static final long TTL_MILLIS = Duration.ofHours(2).toMillis();
    private static final long CLEANUP_INTERVAL_MILLIS = Duration.ofMinutes(10).toMillis();

    private final CardRepository cardRepository;
    private final GameHistoryStore gameHistoryStore;
    private final ConcurrentHashMap<String, GameState> gameStates = new ConcurrentHashMap<>();
    private volatile long lastCleanupAt = 0L;

    public NextRandomCardService(CardRepository cardRepository, GameHistoryStore gameHistoryStore) {
        this.cardRepository = cardRepository;
        this.gameHistoryStore = gameHistoryStore;
    }

    public Card nextRandom(String language, String gameId, String topic) {
        String normalizedLanguage = normalizeRequired(language, "language");
        String normalizedGameId = normalizeRequired(gameId, "gameId");
        String normalizedTopic = normalizeOptional(topic);

        maybeCleanup();

        List<Card> pool = cardRepository.findDeckPool(normalizedLanguage, normalizedTopic, ALLOWED_SOURCES);
        if (pool.isEmpty()) {
            String topicPart = normalizedTopic == null ? "any" : normalizedTopic;
            throw new NoSuchElementException("No cards available for language=" + normalizedLanguage + ", topic=" + topicPart);
        }

        GameState state = gameStates.computeIfAbsent(normalizedGameId, ignored -> new GameState());
        synchronized (state) {
            state.lastAccessAt = System.currentTimeMillis();

            List<DeckCardMeta> history = gameHistoryStore.readRecent(normalizedGameId, LAST_K_DEFAULT);
            DeckCardMeta last = history.isEmpty() ? null : history.get(history.size() - 1);
            Set<String> recentIds = recentCardIds(history);
            List<String> relaxed = new ArrayList<>();

            Card selected = pickWithRelaxation(pool, last, recentIds, relaxed);
            gameHistoryStore.append(
                    normalizedGameId,
                    new DeckCardMeta(selected.getId(), resolveCategory(selected), selected.getTopic()),
                    LAST_K_DEFAULT
            );

            log.info("nextRandom gameId={} cardId={} category={} topic={} pool={} relaxed={}",
                    normalizedGameId,
                    selected.getId(),
                    resolveCategory(selected),
                    selected.getTopic(),
                    pool.size(),
                    relaxed);

            return selected;
        }
    }

    static Card pickWithRelaxation(List<Card> pool,
                                   DeckCardMeta last,
                                   Set<String> recentIds,
                                   List<String> relaxed) {
        List<Card> strict = applyConstraints(pool, last, recentIds, true, true, true);
        if (!strict.isEmpty()) {
            return randomCard(strict);
        }

        relaxed.add("cardId");
        List<Card> relaxCardId = applyConstraints(pool, last, recentIds, true, true, false);
        if (!relaxCardId.isEmpty()) {
            return randomCard(relaxCardId);
        }

        relaxed.add("topic");
        List<Card> relaxTopic = applyConstraints(pool, last, recentIds, true, false, false);
        if (!relaxTopic.isEmpty()) {
            return randomCard(relaxTopic);
        }

        relaxed.add("category");
        return randomCard(pool);
    }

    private static List<Card> applyConstraints(List<Card> pool,
                                               DeckCardMeta last,
                                               Set<String> recentIds,
                                               boolean enforceCategory,
                                               boolean enforceTopic,
                                               boolean enforceCardId) {
        List<Card> result = new ArrayList<>(pool.size());
        for (Card card : pool) {
            if (enforceCategory && last != null && resolveCategory(card).equalsIgnoreCase(last.category())) {
                continue;
            }
            if (enforceTopic && last != null && equalsIgnoreCase(card.getTopic(), last.topic())) {
                continue;
            }
            if (enforceCardId && recentIds.contains(card.getId())) {
                continue;
            }
            result.add(card);
        }
        return result;
    }

    private static Card randomCard(List<Card> cards) {
        if (cards.isEmpty()) {
            throw new NoSuchElementException("No cards available");
        }
        int idx = ThreadLocalRandom.current().nextInt(cards.size());
        return cards.get(idx);
    }

    private static Set<String> recentCardIds(List<DeckCardMeta> history) {
        if (history.isEmpty()) {
            return Set.of();
        }

        Set<String> ids = new HashSet<>();
        Iterator<DeckCardMeta> iterator = history.iterator();
        while (iterator.hasNext()) {
            ids.add(iterator.next().cardId());
        }
        return ids;
    }

    static String resolveCategory(Card card) {
        String raw = card.getCategory();
        if (raw == null || raw.isBlank()) {
            raw = card.getSubtopic();
        }
        if (raw == null || raw.isBlank()) {
            return "OPEN";
        }

        String normalized = raw.trim().toUpperCase(Locale.ROOT)
                .replace('-', '_')
                .replace(' ', '_');

        return switch (normalized) {
            case "TRUE_FALSE", "NUMBER", "ORDER", "CENTURY_DECADE", "COLOR", "OPEN" -> normalized;
            default -> "OPEN";
        };
    }

    private void maybeCleanup() {
        long now = System.currentTimeMillis();
        if (now - lastCleanupAt < CLEANUP_INTERVAL_MILLIS) {
            return;
        }
        lastCleanupAt = now;

        List<String> expiredGameIds = gameStates.entrySet().stream()
                .filter(entry -> now - entry.getValue().lastAccessAt > TTL_MILLIS)
                .map(java.util.Map.Entry::getKey)
                .toList();
        for (String gameId : expiredGameIds) {
            gameStates.remove(gameId);
            gameHistoryStore.evict(gameId);
        }

        int overflow = gameStates.size() - MAX_TRACKED_GAMES;
        if (overflow <= 0) {
            return;
        }

        List<String> oldestKeys = gameStates.entrySet().stream()
                .sorted(Comparator.comparingLong(entry -> entry.getValue().lastAccessAt))
                .limit(overflow)
                .map(java.util.Map.Entry::getKey)
                .toList();

        for (String key : oldestKeys) {
            gameStates.remove(key);
            gameHistoryStore.evict(key);
        }
    }

    private static String normalizeRequired(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return value.trim();
    }

    private static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private static boolean equalsIgnoreCase(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return a.equalsIgnoreCase(b);
    }

    private static final class GameState {
        private long lastAccessAt = System.currentTimeMillis();
    }
}
