package com.smartiq.backend.card;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
    private static final String DEFAULT_FALLBACK_LANGUAGE = "en";
    private static final int MAX_TRACKED_GAMES = 10_000;
    private static final long TTL_MILLIS = Duration.ofHours(2).toMillis();
    private static final long CLEANUP_INTERVAL_MILLIS = Duration.ofMinutes(10).toMillis();
    private static final int MAX_GAME_ID_LENGTH = 128;
    private static final int MAX_LANGUAGE_LENGTH = 32;
    private static final int MAX_TOPIC_LENGTH = 128;

    private final CardRepository cardRepository;
    private final GameHistoryStore gameHistoryStore;
    private final MeterRegistry meterRegistry;
    private final boolean etEnabled;
    private final ConcurrentHashMap<String, GameState> gameStates = new ConcurrentHashMap<>();
    private volatile long lastCleanupAt = 0L;

    public NextRandomCardService(CardRepository cardRepository,
                                 GameHistoryStore gameHistoryStore,
                                 MeterRegistry meterRegistry,
                                 @Value("${smartiq.language.et-enabled:false}") boolean etEnabled) {
        this.cardRepository = cardRepository;
        this.gameHistoryStore = gameHistoryStore;
        this.meterRegistry = meterRegistry;
        this.etEnabled = etEnabled;
    }

    public Card nextRandom(String language, String gameId, String topic) {
        String normalizedLanguage = normalizeLanguage(language, etEnabled);
        String normalizedGameId = normalizeGameId(gameId);
        String normalizedTopic = normalizeOptional(topic);

        maybeCleanup();

        String effectiveLanguage = normalizedLanguage;
        List<Card> pool = cardRepository.findDeckPool(effectiveLanguage, normalizedTopic, CardSourcePolicy.ALLOWED_SOURCES);
        boolean languageRelaxed = false;
        if (pool.isEmpty() && !DEFAULT_FALLBACK_LANGUAGE.equalsIgnoreCase(normalizedLanguage)) {
            effectiveLanguage = DEFAULT_FALLBACK_LANGUAGE;
            pool = cardRepository.findDeckPool(effectiveLanguage, normalizedTopic, CardSourcePolicy.ALLOWED_SOURCES);
            languageRelaxed = !pool.isEmpty();
        }
        if (pool.isEmpty()) {
            String topicPart = normalizedTopic == null ? "any" : normalizedTopic;
            throw new NoSuchElementException("No cards available for language=" + normalizedLanguage + ", topic=" + topicPart);
        }

        GameState state = gameStates.computeIfAbsent(normalizedGameId, ignored -> new GameState());
        synchronized (state) {
            state.lastAccessAt = System.currentTimeMillis();

            List<DeckCardMeta> history = gameHistoryStore.readRecent(normalizedGameId, LAST_K_DEFAULT);
            int historyBefore = history.size();
            boolean newGame = historyBefore == 0;
            int drawNumber = historyBefore + 1;
            boolean historyTrimmed = historyBefore >= LAST_K_DEFAULT;
            DeckCardMeta last = history.isEmpty() ? null : history.get(history.size() - 1);
            Set<String> recentIds = recentCardIds(history);
            List<String> relaxed = new ArrayList<>();
            if (languageRelaxed) {
                relaxed.add("language");
            }

            Card selected = pickWithRelaxation(pool, last, recentIds, relaxed);
            gameHistoryStore.append(
                    normalizedGameId,
                    new DeckCardMeta(selected.getId(), resolveCategory(selected), selected.getTopic()),
                    LAST_K_DEFAULT
            );
            int historyAfter = Math.min(historyBefore + 1, LAST_K_DEFAULT);
            recordMetrics(last, selected, relaxed, effectiveLanguage);

            log.info("nextRandom gameId={} draw={} newGame={} cardId={} category={} topic={} language={} pool={} historyBefore={} historyAfter={} historyTrimmed={} relaxed={}",
                    normalizedGameId,
                    drawNumber,
                    newGame,
                    selected.getId(),
                    resolveCategory(selected),
                    selected.getTopic(),
                    effectiveLanguage,
                    pool.size(),
                    historyBefore,
                    historyAfter,
                    historyTrimmed,
                    relaxed);

            return selected;
        }
    }

    public boolean isLanguageEnabled(String language) {
        return switch (String.valueOf(language).trim().toLowerCase(Locale.ROOT)) {
            case "en" -> true;
            case "et" -> etEnabled;
            default -> false;
        };
    }

    private void recordMetrics(DeckCardMeta last, Card selected, List<String> relaxed, String language) {
        String category = resolveCategory(selected);
        String topic = selected.getTopic() == null ? "unknown" : selected.getTopic();
        String source = selected.getSource() == null ? "unknown" : selected.getSource();

        counter("smartiq.next_random.draw.total", "language", language).increment();
        counter("smartiq.next_random.source.total", "source", source).increment();

        if (relaxed.isEmpty()) {
            counter("smartiq.next_random.relax.total", "level", "none").increment();
        } else {
            for (String level : relaxed) {
                counter("smartiq.next_random.relax.total", "level", level).increment();
            }
        }

        if (last != null) {
            if (category.equalsIgnoreCase(last.category())) {
                counter("smartiq.next_random.immediate_repeat.total", "kind", "category").increment();
            }
            if (equalsIgnoreCase(topic, last.topic())) {
                counter("smartiq.next_random.immediate_repeat.total", "kind", "topic").increment();
            }
            if (selected.getId() != null && selected.getId().equals(last.cardId())) {
                counter("smartiq.next_random.immediate_repeat.total", "kind", "cardId").increment();
            }
        }
    }

    private Counter counter(String metricName, String tagKey, String tagValue) {
        return Counter.builder(metricName)
                .tag(tagKey, tagValue == null || tagValue.isBlank() ? "unknown" : tagValue)
                .register(meterRegistry);
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

    private static String normalizeGameId(String value) {
        String normalized = normalizeRequired(value, "gameId");
        if (normalized.length() > MAX_GAME_ID_LENGTH) {
            throw new IllegalArgumentException("gameId is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("gameId contains control characters");
        }
        return normalized;
    }

    static String normalizeLanguage(String value, boolean etEnabled) {
        String normalized = normalizeRequired(value, "language").toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            throw new IllegalArgumentException("language is required");
        }
        if (normalized.length() > MAX_LANGUAGE_LENGTH) {
            throw new IllegalArgumentException("language is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("language contains control characters");
        }
        if ("et".equals(normalized) && !etEnabled) {
            throw new IllegalArgumentException("language et is disabled");
        }
        return normalized;
    }

    private static String normalizeOptional(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.length() > MAX_TOPIC_LENGTH) {
            throw new IllegalArgumentException("topic is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("topic contains control characters");
        }
        return normalized;
    }

    private static boolean equalsIgnoreCase(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return a.equalsIgnoreCase(b);
    }

    private static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }

    private static final class GameState {
        private long lastAccessAt = System.currentTimeMillis();
    }
}
