package com.smartiq.backend.game;

import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.tenant.ForbiddenTenantAccessException;
import com.smartiq.backend.shared.RuntimeLimits;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

final class GameSessionSupport {

    private static final int MIN_PLAYERS = 1;
    private static final int MAX_PLAYERS = RuntimeLimits.MAX_PLAYERS_PER_ROOM;
    private static final String DEFAULT_LANGUAGE = "en";
    private static final String PEG_HIDDEN = "hidden";
    private static final int MAX_GAME_ID_LENGTH = 128;
    private static final int MAX_PLAYER_ID_LENGTH = 64;
    private static final int MAX_ACTION_TOKEN_LENGTH = 128;
    private static final int MAX_ACTION_REQUEST_ID_LENGTH = 128;
    private static final int MAX_TOPIC_LENGTH = 128;
    private static final int MAX_PLAYER_DISPLAY_NAME_LENGTH = 64;
    private static final Pattern ACTOR_PLAYER_ID_PATTERN = Pattern.compile("^p[1-9][0-9]*$");
    private static final Pattern ACTION_TOKEN_PATTERN = Pattern.compile("^at_[a-f0-9]{32}$");
    private static final Pattern ACTION_REQUEST_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("en", "et");

    private GameSessionSupport() {
    }

    static boolean isCorrect(CardDeckResponse card, int tileIndex) {
        Map<String, Object> correct = card.correct() == null ? Map.of() : card.correct();
        return resolveCorrectIndexes(correct).contains(tileIndex);
    }

    static Set<Integer> resolveCorrectIndexes(Map<String, Object> correct) {
        List<Integer> indexes = asIntegerList(correct.get("correctIndexes"));
        if (!indexes.isEmpty()) {
            return Set.copyOf(indexes);
        }
        Integer single = asInteger(correct.get("correctIndex"));
        if (single != null) {
            return Set.of(single);
        }
        return Set.of();
    }

    static List<PlayerState> buildPlayers(List<String> displayNames) {
        List<PlayerState> players = new ArrayList<>();
        for (int idx = 0; idx < displayNames.size(); idx += 1) {
            players.add(new PlayerState("p" + (idx + 1), displayNames.get(idx)));
        }
        return players;
    }

    static Map<String, Integer> zeroScores(List<PlayerState> players) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        for (PlayerState player : players) {
            scores.put(player.playerId(), 0);
        }
        return scores;
    }

    static Map<String, PlayerRoundStatus> activeStatuses(List<PlayerState> players) {
        Map<String, PlayerRoundStatus> statuses = new LinkedHashMap<>();
        for (PlayerState player : players) {
            statuses.put(player.playerId(), PlayerRoundStatus.ACTIVE);
        }
        return statuses;
    }

    static Map<String, String> issueActionTokens(List<PlayerState> players) {
        Map<String, String> tokens = new LinkedHashMap<>();
        for (PlayerState player : players) {
            tokens.put(player.playerId(), "at_" + UUID.randomUUID().toString().replace("-", ""));
        }
        return tokens;
    }

    static List<PegState> hiddenPegs(int count) {
        List<PegState> pegs = new ArrayList<>();
        for (int idx = 0; idx < count; idx += 1) {
            pegs.add(new PegState(idx, PEG_HIDDEN));
        }
        return pegs;
    }

    static String normalizeActionType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            throw new IllegalArgumentException("type is required");
        }
        return rawType.trim().toUpperCase(Locale.ROOT);
    }

    static List<String> normalizePlayers(List<String> rawPlayers) {
        if (rawPlayers == null || rawPlayers.isEmpty()) {
            return List.of("Player 1", "Player 2");
        }

        List<String> normalized = rawPlayers.stream()
                .map(GameSessionSupport::normalizePlayerDisplayName)
                .filter(value -> !value.isBlank())
                .toList();

        if (normalized.size() < MIN_PLAYERS || normalized.size() > MAX_PLAYERS) {
            throw new IllegalArgumentException("players must be between " + MIN_PLAYERS + " and " + MAX_PLAYERS);
        }

        return normalized;
    }

    static int resolveWinCondition(Integer requested, int defaultWinCondition) {
        if (requested == null) {
            return defaultWinCondition;
        }
        if (requested < 1) {
            throw new IllegalArgumentException("winCondition must be >= 1");
        }
        return requested;
    }

    static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return DEFAULT_LANGUAGE;
        }
        String normalized = language.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_LANGUAGES.contains(normalized)) {
            return DEFAULT_LANGUAGE;
        }
        return normalized;
    }

    static String normalizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return null;
        }
        String normalized = topic.trim();
        if (normalized.length() > MAX_TOPIC_LENGTH) {
            throw new IllegalArgumentException("topic is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("topic contains control characters");
        }
        return normalized;
    }

    static String normalizeOptionalHostUserEmail(String hostUserEmail) {
        if (hostUserEmail == null) {
            return null;
        }
        String normalized = hostUserEmail.trim().toLowerCase(Locale.ROOT);
        return normalized.isEmpty() ? null : normalized;
    }

    static String normalizeRequiredField(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }
        return normalized;
    }

    static String normalizeActionRequestId(String value) {
        String normalized = normalizeRequiredField(value, "actionRequestId", MAX_ACTION_REQUEST_ID_LENGTH);
        if (!ACTION_REQUEST_ID_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("actionRequestId format is invalid");
        }
        return normalized;
    }

    static void requireActionTokenFormat(String actionToken) {
        if (!ACTION_TOKEN_PATTERN.matcher(actionToken).matches()) {
            throw new ForbiddenGameActionException("invalid action token");
        }
    }

    static void requireActorPlayerIdFormat(String actorPlayerId) {
        if (!ACTOR_PLAYER_ID_PATTERN.matcher(actorPlayerId).matches()) {
            throw new IllegalArgumentException("actorPlayerId format is invalid");
        }
        int actorNumber;
        try {
            actorNumber = Integer.parseInt(actorPlayerId.substring(1));
        } catch (NumberFormatException ex) {
            throw new IllegalArgumentException("actorPlayerId format is invalid");
        }
        if (actorNumber < 1 || actorNumber > MAX_PLAYERS) {
            throw new IllegalArgumentException("actorPlayerId format is invalid");
        }
    }

    static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }

    static String classifyActionFailure(RuntimeException ex) {
        if (ex instanceof DuplicateGameActionException) {
            return "duplicate_action_request";
        }
        if (ex instanceof ForbiddenGameActionException) {
            String message = normalizeMessage(ex);
            if (message.contains("invalid action token")) {
                return "invalid_action_token";
            }
            if (message.contains("unknown action actor")) {
                return "unknown_action_actor";
            }
            if (message.contains("actor is not active player")) {
                return "actor_not_active";
            }
            return "forbidden_action";
        }
        if (ex instanceof NoSuchElementException) {
            String message = normalizeMessage(ex);
            if (message.contains("game not found")) {
                return "game_not_found";
            }
            return "not_found";
        }
        if (ex instanceof IllegalArgumentException) {
            String message = normalizeMessage(ex);
            if (message.contains("action payload is required")) {
                return "invalid_payload";
            }
            if (message.contains("actorplayerid")) {
                return "invalid_actor_player_id";
            }
            if (message.contains("actionrequestid")) {
                return "invalid_action_request_id";
            }
            if (message.contains("actiontoken")) {
                return "invalid_action_token";
            }
            return "invalid_request";
        }
        return "internal_error";
    }

    static void assertTenantAccess(GameSessionState state, UUID tenantIdContext) {
        if (tenantIdContext == null || state.tenantId == null) {
            return;
        }
        if (!tenantIdContext.equals(state.tenantId)) {
            throw new ForbiddenTenantAccessException("tenant does not have access to game session");
        }
    }

    static String playerNameById(GameSessionState state, String playerId) {
        for (PlayerState player : state.players) {
            if (player.playerId().equals(playerId)) {
                return player.displayName();
            }
        }
        return playerId;
    }

    static void validateGameId(String gameId) {
        if (gameId == null || gameId.isBlank()) {
            throw new IllegalArgumentException("gameId is required");
        }
        String normalized = gameId.trim();
        if (normalized.length() > MAX_GAME_ID_LENGTH) {
            throw new IllegalArgumentException("gameId is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("gameId contains control characters");
        }
    }

    static boolean secureEquals(String expected, String provided) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static Integer asInteger(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private static List<Integer> asIntegerList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Integer> parsed = new ArrayList<>();
        for (Object entry : list) {
            Integer parsedInt = asInteger(entry);
            if (parsedInt != null) {
                parsed.add(parsedInt);
            }
        }
        return parsed;
    }

    private static String normalizePlayerDisplayName(String rawName) {
        String normalized = rawName == null ? "" : rawName.trim();
        if (normalized.length() > MAX_PLAYER_DISPLAY_NAME_LENGTH) {
            throw new IllegalArgumentException("player displayName is too long");
        }
        if (containsControlChars(normalized)) {
            throw new IllegalArgumentException("player displayName contains control characters");
        }
        return normalized;
    }

    private static String normalizeMessage(RuntimeException ex) {
        if (ex.getMessage() == null) {
            return "";
        }
        return ex.getMessage().trim().toLowerCase(Locale.ROOT);
    }
}
