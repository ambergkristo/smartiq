package com.smartiq.backend.game;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.game.contract.PlayerRoundStatus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

final class GameSessionStateCodec {
    private static final int DEFAULT_WIN_CONDITION = 30;
    private static final int ACTION_REQUEST_HISTORY_LIMIT = 512;
    private static final int MAX_ACTION_REQUEST_ID_LENGTH = 128;
    private static final Pattern ACTION_TOKEN_PATTERN = Pattern.compile("^at_[a-f0-9]{32}$");
    private static final Pattern ACTION_REQUEST_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final String PEG_HIDDEN = "hidden";
    private static final String PEG_REVEALED = "revealed";
    private static final String PEG_WRONG = "wrong";
    private static final String PHASE_QUESTION_ACTIVE = "QUESTION_ACTIVE";
    private static final String PHASE_ROUND_SUCCESS = "ROUND_SUCCESS";
    private static final String PHASE_ROUND_FAIL = "ROUND_FAIL";
    private static final String PHASE_GAME_OVER = "GAME_OVER";

    private final ObjectMapper objectMapper;

    GameSessionStateCodec(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    String serialize(GameSessionState state) throws Exception {
        return objectMapper.writeValueAsString(toStoredSessionState(state));
    }

    GameSessionState deserialize(String gameId, String payload, long nowMillis) throws Exception {
        StoredGameSessionState stored = objectMapper.readValue(payload, StoredGameSessionState.class);
        return fromStoredSessionState(gameId, stored, nowMillis);
    }

    private static StoredGameSessionState toStoredSessionState(GameSessionState state) {
        List<StoredPlayerState> players = state.players.stream()
                .map(player -> new StoredPlayerState(player.playerId(), player.displayName()))
                .toList();
        List<StoredPegState> pegs = state.pegs.stream()
                .map(peg -> new StoredPegState(peg.index(), peg.state()))
                .toList();
        return new StoredGameSessionState(
                state.gameId,
                state.tenantId,
                state.hostUserEmail,
                state.language,
                state.topic,
                state.winCondition,
                players,
                new LinkedHashMap<>(state.totalScores),
                new LinkedHashMap<>(state.roundScores),
                new LinkedHashMap<>(state.statuses),
                new LinkedHashMap<>(state.actionTokens),
                new ArrayList<>(state.processedActionRequestIds),
                state.roundNumber,
                state.starterPlayerIndex,
                state.activePlayerIndex,
                state.phase,
                state.lastAction,
                state.card,
                pegs,
                state.gameStartedAtMillis,
                state.roundStartedAtMillis,
                state.lastTouchedAtMillis
        );
    }

    private static GameSessionState fromStoredSessionState(String gameId, StoredGameSessionState stored, long nowMillis) {
        if (stored == null || stored.players() == null || stored.players().isEmpty()) {
            throw new IllegalArgumentException("stored session is missing players");
        }
        if (stored.card() == null || stored.card().options() == null || stored.card().options().isEmpty()) {
            throw new IllegalArgumentException("stored session is missing card data");
        }

        List<PlayerState> players = new ArrayList<>();
        for (StoredPlayerState storedPlayer : stored.players()) {
            if (storedPlayer == null || storedPlayer.playerId() == null || storedPlayer.playerId().isBlank()) {
                continue;
            }
            String displayName = storedPlayer.displayName() == null ? "" : storedPlayer.displayName();
            players.add(new PlayerState(storedPlayer.playerId(), displayName));
        }
        if (players.isEmpty()) {
            throw new IllegalArgumentException("stored session has no valid players");
        }

        String language = normalizeLanguage(stored.language());
        String topic = normalizeTopic(stored.topic());
        int winCondition = stored.winCondition() == null || stored.winCondition() < 1
                ? DEFAULT_WIN_CONDITION
                : stored.winCondition();
        Map<String, Integer> totalScores = normalizeStoredScores(stored.totalScores(), players);
        Map<String, Integer> roundScores = normalizeStoredScores(stored.roundScores(), players);
        Map<String, PlayerRoundStatus> statuses = normalizeStoredStatuses(stored.statuses(), players);
        Map<String, String> actionTokens = normalizeStoredTokens(stored.actionTokens(), players);
        LinkedHashSet<String> processedActionRequestIds = normalizeProcessedActionRequestIds(stored.processedActionRequestIds());
        int roundNumber = stored.roundNumber() == null || stored.roundNumber() < 1 ? 1 : stored.roundNumber();
        int starterPlayerIndex = normalizeStoredIndex(stored.starterPlayerIndex(), players.size(), 0);
        int activePlayerIndex = normalizeStoredIndex(stored.activePlayerIndex(), players.size(), starterPlayerIndex);
        String phase = normalizeStoredPhase(stored.phase());
        String lastAction = normalizeStoredLastAction(stored.lastAction());
        List<PegState> pegs = normalizeStoredPegs(stored.pegs(), stored.card().options().size());
        long gameStartedAtMillis = normalizeStoredTimestamp(stored.gameStartedAtMillis(), nowMillis);
        long roundStartedAtMillis = normalizeStoredTimestamp(stored.roundStartedAtMillis(), nowMillis);
        long lastTouchedAtMillis = normalizeStoredTimestamp(stored.lastTouchedAtMillis(), nowMillis);

        return new GameSessionState(
                gameId,
                stored.tenantId(),
                normalizeOptionalHostUserEmail(stored.hostUserEmail()),
                language,
                topic,
                winCondition,
                players,
                totalScores,
                roundScores,
                statuses,
                actionTokens,
                processedActionRequestIds,
                roundNumber,
                starterPlayerIndex,
                activePlayerIndex,
                phase,
                lastAction,
                stored.card(),
                pegs,
                gameStartedAtMillis,
                roundStartedAtMillis,
                lastTouchedAtMillis
        );
    }

    private static Map<String, Integer> normalizeStoredScores(Map<String, Integer> source, List<PlayerState> players) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        for (PlayerState player : players) {
            Integer score = source == null ? null : source.get(player.playerId());
            scores.put(player.playerId(), score == null ? 0 : Math.max(0, score));
        }
        return scores;
    }

    private static Map<String, PlayerRoundStatus> normalizeStoredStatuses(Map<String, PlayerRoundStatus> source,
                                                                          List<PlayerState> players) {
        Map<String, PlayerRoundStatus> statuses = new LinkedHashMap<>();
        for (PlayerState player : players) {
            PlayerRoundStatus status = source == null ? null : source.get(player.playerId());
            statuses.put(player.playerId(), status == null ? PlayerRoundStatus.ACTIVE : status);
        }
        return statuses;
    }

    private static Map<String, String> normalizeStoredTokens(Map<String, String> source, List<PlayerState> players) {
        if (source == null) {
            throw new IllegalArgumentException("stored session is missing action tokens");
        }
        Map<String, String> tokens = new LinkedHashMap<>();
        for (PlayerState player : players) {
            String token = source.get(player.playerId());
            if (token == null || token.isBlank()) {
                throw new IllegalArgumentException("stored session is missing action token");
            }
            if (!ACTION_TOKEN_PATTERN.matcher(token).matches()) {
                throw new IllegalArgumentException("stored session has invalid action token");
            }
            tokens.put(player.playerId(), token);
        }
        return tokens;
    }

    private static LinkedHashSet<String> normalizeProcessedActionRequestIds(List<String> source) {
        LinkedHashSet<String> actionRequestIds = new LinkedHashSet<>();
        if (source == null) {
            return actionRequestIds;
        }
        for (String candidate : source) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }
            String normalized = candidate.trim();
            if (normalized.length() > MAX_ACTION_REQUEST_ID_LENGTH) {
                continue;
            }
            if (!ACTION_REQUEST_ID_PATTERN.matcher(normalized).matches()) {
                continue;
            }
            actionRequestIds.add(normalized);
            while (actionRequestIds.size() > ACTION_REQUEST_HISTORY_LIMIT) {
                String oldest = actionRequestIds.iterator().next();
                actionRequestIds.remove(oldest);
            }
        }
        return actionRequestIds;
    }

    private static List<PegState> normalizeStoredPegs(List<StoredPegState> source, int expectedCount) {
        List<PegState> pegs = hiddenPegs(expectedCount);
        if (source == null || source.isEmpty()) {
            return pegs;
        }
        for (StoredPegState storedPeg : source) {
            if (storedPeg == null || storedPeg.index() == null) {
                continue;
            }
            int index = storedPeg.index();
            if (index < 0 || index >= expectedCount) {
                continue;
            }
            pegs.set(index, new PegState(index, normalizeStoredPegState(storedPeg.state())));
        }
        return pegs;
    }

    private static List<PegState> hiddenPegs(int count) {
        List<PegState> pegs = new ArrayList<>();
        for (int idx = 0; idx < count; idx += 1) {
            pegs.add(new PegState(idx, PEG_HIDDEN));
        }
        return pegs;
    }

    private static String normalizeStoredPegState(String state) {
        if (state == null || state.isBlank()) {
            return PEG_HIDDEN;
        }
        String normalized = state.trim().toLowerCase(Locale.ROOT);
        if (PEG_REVEALED.equals(normalized)) {
            return PEG_REVEALED;
        }
        if (PEG_WRONG.equals(normalized)) {
            return PEG_WRONG;
        }
        return PEG_HIDDEN;
    }

    private static int normalizeStoredIndex(Integer candidate, int size, int fallback) {
        if (candidate == null || size <= 0) {
            return fallback;
        }
        if (candidate < 0 || candidate >= size) {
            return fallback;
        }
        return candidate;
    }

    private static String normalizeStoredPhase(String phase) {
        if (phase == null || phase.isBlank()) {
            return PHASE_QUESTION_ACTIVE;
        }
        String normalized = phase.trim().toUpperCase(Locale.ROOT);
        if ("CHOOSING".equals(normalized)) {
            return PHASE_QUESTION_ACTIVE;
        }
        if (PHASE_QUESTION_ACTIVE.equals(normalized)
                || PHASE_ROUND_SUCCESS.equals(normalized)
                || PHASE_ROUND_FAIL.equals(normalized)
                || PHASE_GAME_OVER.equals(normalized)) {
            return normalized;
        }
        return PHASE_QUESTION_ACTIVE;
    }

    private static String normalizeStoredLastAction(String lastAction) {
        if (lastAction == null || lastAction.isBlank()) {
            return "Game resumed";
        }
        return lastAction;
    }

    private static long normalizeStoredTimestamp(Long candidate, long fallback) {
        if (candidate == null || candidate <= 0L) {
            return fallback;
        }
        return candidate;
    }

    private static String normalizeOptionalHostUserEmail(String hostUserEmail) {
        if (hostUserEmail == null) {
            return null;
        }
        String normalized = hostUserEmail.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    private static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return "en";
        }
        String normalized = language.trim().toLowerCase(Locale.ROOT);
        if (!Set.of("en", "et").contains(normalized)) {
            return "en";
        }
        return normalized;
    }

    private static String normalizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return null;
        }
        String normalized = topic.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private record StoredGameSessionState(
            String gameId,
            UUID tenantId,
            String hostUserEmail,
            String language,
            String topic,
            Integer winCondition,
            List<StoredPlayerState> players,
            Map<String, Integer> totalScores,
            Map<String, Integer> roundScores,
            Map<String, PlayerRoundStatus> statuses,
            Map<String, String> actionTokens,
            List<String> processedActionRequestIds,
            Integer roundNumber,
            Integer starterPlayerIndex,
            Integer activePlayerIndex,
            String phase,
            String lastAction,
            CardDeckResponse card,
            List<StoredPegState> pegs,
            Long gameStartedAtMillis,
            Long roundStartedAtMillis,
            Long lastTouchedAtMillis
    ) {
    }

    private record StoredPlayerState(String playerId, String displayName) {
    }

    private record StoredPegState(Integer index, String state) {
    }
}
