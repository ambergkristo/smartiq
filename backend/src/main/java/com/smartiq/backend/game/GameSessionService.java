package com.smartiq.backend.game;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.card.CardService;
import com.smartiq.backend.config.GameSessionProperties;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import com.smartiq.backend.shared.RuntimeLimits;
import com.smartiq.backend.tenant.ForbiddenTenantAccessException;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class GameSessionService {

    private static final int DEFAULT_WIN_CONDITION = 30;
    private static final int BOARD_ANSWER_COUNT = 8;
    private static final int MAX_CARD_FETCH_ATTEMPTS = 24;
    private static final int MIN_PLAYERS = 1;
    private static final int MAX_PLAYERS = RuntimeLimits.MAX_PLAYERS_PER_ROOM;
    private static final String DEFAULT_LANGUAGE = "en";
    private static final String PHASE_QUESTION_ACTIVE = "QUESTION_ACTIVE";
    private static final String PHASE_ROUND_SUCCESS = "ROUND_SUCCESS";
    private static final String PHASE_ROUND_FAIL = "ROUND_FAIL";
    private static final String PHASE_GAME_OVER = "GAME_OVER";
    private static final String PEG_HIDDEN = "hidden";
    private static final String PEG_REVEALED = "revealed";
    private static final String PEG_WRONG = "wrong";
    private static final String METRIC_GAME_STARTED = "smartiq.game.session.started.total";
    private static final String METRIC_GAME_COMPLETED = "smartiq.game.session.completed.total";
    private static final String METRIC_ROUND_COMPLETED = "smartiq.game.round.completed.total";
    private static final String METRIC_ACTION_TOTAL = "smartiq.game.action.total";
    private static final String METRIC_ACTION_REJECTED = "smartiq.game.action.rejected.total";
    private static final String METRIC_ANSWER_TOTAL = "smartiq.game.answer.total";
    private static final String METRIC_GAME_DURATION = "smartiq.game.duration.seconds";
    private static final String METRIC_ROUND_DURATION = "smartiq.game.round.duration.seconds";
    private static final String METRIC_SESSION_EVICTED = "smartiq.game.session.evicted.total";
    private static final int ACTION_REQUEST_HISTORY_LIMIT = 512;
    private static final int MAX_GAME_ID_LENGTH = 128;
    private static final int MAX_PLAYER_ID_LENGTH = 64;
    private static final int MAX_ACTION_TOKEN_LENGTH = 128;
    private static final int MAX_ACTION_REQUEST_ID_LENGTH = 128;
    private static final int MAX_TOPIC_LENGTH = 128;
    private static final Pattern ACTOR_PLAYER_ID_PATTERN = Pattern.compile("^p[1-9][0-9]*$");
    private static final Pattern ACTION_TOKEN_PATTERN = Pattern.compile("^at_[a-f0-9]{32}$");
    private static final Pattern ACTION_REQUEST_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]+$");
    private static final Set<String> SUPPORTED_LANGUAGES = Set.of("en", "et");
    private static final int MAX_PLAYER_DISPLAY_NAME_LENGTH = 64;
    private static final int DEFAULT_SESSION_RETENTION_MINUTES = 180;
    private static final int DEFAULT_SESSION_MAX = 50000;

    private final CardService cardService;
    private final MeterRegistry meterRegistry;
    private final GameSessionStore gameSessionStore;
    private final ObjectMapper objectMapper;
    private final Clock clock;
    private final long sessionRetentionMillis;
    private final int sessionMax;
    private final ConcurrentMap<String, SessionState> sessions = new ConcurrentHashMap<>();

    @Autowired
    public GameSessionService(CardService cardService,
                              MeterRegistry meterRegistry,
                              GameSessionProperties gameSessionProperties,
                              GameSessionStore gameSessionStore,
                              ObjectMapper objectMapper) {
        this(cardService, meterRegistry, gameSessionProperties, gameSessionStore, objectMapper, Clock.systemUTC());
    }

    GameSessionService(CardService cardService,
                       MeterRegistry meterRegistry,
                       GameSessionProperties gameSessionProperties,
                       GameSessionStore gameSessionStore,
                       ObjectMapper objectMapper,
                       Clock clock) {
        this.cardService = cardService;
        this.meterRegistry = meterRegistry;
        this.gameSessionStore = gameSessionStore;
        this.objectMapper = objectMapper;
        this.clock = clock;
        int retentionMinutes = gameSessionProperties == null
                ? DEFAULT_SESSION_RETENTION_MINUTES
                : gameSessionProperties.sessionRetentionMinutes();
        this.sessionRetentionMillis = Math.max(1, retentionMinutes) * 60_000L;
        int configuredSessionMax = gameSessionProperties == null
                ? DEFAULT_SESSION_MAX
                : gameSessionProperties.sessionMax();
        this.sessionMax = Math.max(1, configuredSessionMax);
    }

    GameSessionService(CardService cardService,
                       MeterRegistry meterRegistry,
                       GameSessionProperties gameSessionProperties,
                       Clock clock) {
        this(
                cardService,
                meterRegistry,
                gameSessionProperties,
                new InMemoryGameSessionStore(),
                new ObjectMapper(),
                clock
        );
    }

    GameSessionService(CardService cardService, MeterRegistry meterRegistry) {
        this(
                cardService,
                meterRegistry,
                new GameSessionProperties(DEFAULT_SESSION_RETENTION_MINUTES, DEFAULT_SESSION_MAX),
                new InMemoryGameSessionStore(),
                new ObjectMapper(),
                Clock.systemUTC()
        );
    }

    public synchronized GameSessionCreateResponse createGameWithControl(CreateGameRequest request) {
        return createGameWithControl(request, null, null);
    }

    public synchronized GameSessionCreateResponse createGameWithControl(CreateGameRequest request,
                                                                        UUID tenantId,
                                                                        String hostUserEmail) {
        evictExpiredSessions();
        evictOldestUntilCapacityAvailable();
        SessionState state = createSession(request, tenantId, hostUserEmail);
        return new GameSessionCreateResponse(
                toSnapshot(state),
                Collections.unmodifiableMap(new LinkedHashMap<>(state.actionTokens))
        );
    }

    public synchronized GameSessionSnapshot createGame(CreateGameRequest request) {
        return createGameWithControl(request).snapshot();
    }

    public synchronized CreateGameRequest buildDuplicateRequest(String gameId, UUID tenantIdContext) {
        evictExpiredSessions();
        SessionState state = requireSession(gameId, tenantIdContext);
        List<String> players = state.players.stream()
                .map(PlayerState::displayName)
                .toList();
        return new CreateGameRequest(players, state.language, state.topic, state.winCondition);
    }

    public synchronized GameSessionCreateResponse duplicateGameWithControl(String gameId,
                                                                           UUID tenantIdContext,
                                                                           String hostUserEmail) {
        CreateGameRequest request = buildDuplicateRequest(gameId, tenantIdContext);
        return createGameWithControl(request, tenantIdContext, hostUserEmail);
    }

    public synchronized GameSessionCreateResponse getGameWithControl(String gameId, UUID tenantIdContext) {
        evictExpiredSessions();
        SessionState state = requireSession(gameId, tenantIdContext);
        state.lastTouchedAtMillis = nowMillis();
        persistSession(state);
        return new GameSessionCreateResponse(
                toSnapshot(state),
                Collections.unmodifiableMap(new LinkedHashMap<>(state.actionTokens))
        );
    }

    private CardDeckResponse loadCherryPickCard(String language, String gameId, String topic) {
        for (int attempt = 0; attempt < MAX_CARD_FETCH_ATTEMPTS; attempt += 1) {
            CardDeckResponse candidate = cardService.getNextRandomCard(language, gameId, topic);
            if (isCherryPickCompatibleCard(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("failed to load CherryPick-compatible card");
    }

    private static boolean isCherryPickCompatibleCard(CardDeckResponse card) {
        if (card == null || card.options() == null || card.options().size() != BOARD_ANSWER_COUNT) {
            return false;
        }
        return !resolveCorrectIndexes(card.correct() == null ? Map.of() : card.correct()).isEmpty();
    }

    private SessionState createSession(CreateGameRequest request, UUID tenantId, String hostUserEmail) {
        List<String> displayNames = normalizePlayers(request == null ? null : request.players());
        int winCondition = resolveWinCondition(request == null ? null : request.winCondition());
        String language = normalizeLanguage(request == null ? null : request.language());
        String topic = normalizeTopic(request == null ? null : request.topic());
        long nowMillis = nowMillis();

        String gameId = allocateUniqueGameId();
        List<PlayerState> players = buildPlayers(displayNames);
        Map<String, Integer> totals = zeroScores(players);
        Map<String, Integer> roundScores = zeroScores(players);
        Map<String, PlayerRoundStatus> statuses = activeStatuses(players);
        Map<String, String> actionTokens = issueActionTokens(players);
        CardDeckResponse card = loadCherryPickCard(language, gameId, topic);

        SessionState state = new SessionState(
                gameId,
                tenantId,
                normalizeOptionalHostUserEmail(hostUserEmail),
                language,
                topic,
                winCondition,
                players,
                totals,
                roundScores,
                statuses,
                actionTokens,
                card,
                nowMillis
        );
        sessions.put(gameId, state);
        persistSession(state);
        incrementCounter(METRIC_GAME_STARTED, "language", language);
        return state;
    }

    public synchronized GameSessionSnapshot getSnapshot(String gameId) {
        return getSnapshot(gameId, null);
    }

    public synchronized GameSessionSnapshot getSnapshot(String gameId, UUID tenantIdContext) {
        evictExpiredSessions();
        SessionState state = requireSession(gameId, tenantIdContext);
        state.lastTouchedAtMillis = nowMillis();
        persistSession(state);
        return toSnapshot(state);
    }

    public synchronized GameSessionSnapshot applyAction(String gameId, GameActionRequest request) {
        return applyAction(gameId, request, null);
    }

    public synchronized GameSessionSnapshot applyAction(String gameId, GameActionRequest request, UUID tenantIdContext) {
        try {
            evictExpiredSessions();
            SessionState state = requireSession(gameId, tenantIdContext);
            if (request == null) {
                throw new IllegalArgumentException("action payload is required");
            }
            if (PHASE_GAME_OVER.equals(state.phase)) {
                throw new IllegalArgumentException("game already ended");
            }

            String actorPlayerId = normalizeRequiredField(request.actorPlayerId(), "actorPlayerId", MAX_PLAYER_ID_LENGTH);
            String actionToken = normalizeRequiredField(request.actionToken(), "actionToken", MAX_ACTION_TOKEN_LENGTH);
            String actionRequestId = normalizeActionRequestId(request.actionRequestId());
            requireActorPlayerIdFormat(actorPlayerId);
            requireActionTokenFormat(actionToken);
            requireActionActor(state, actorPlayerId, actionToken);
            requireUniqueActionRequestId(state, actionRequestId);

            String actionType = normalizeActionType(request.type());
            switch (actionType) {
                case "ANSWER" -> applyAnswer(state, request.tileIndex());
                case "ADVANCE" -> applyAdvance(state);
                default -> throw new IllegalArgumentException("unsupported action type: " + actionType);
            }
            rememberActionRequestId(state, actionRequestId);
            state.lastTouchedAtMillis = nowMillis();
            persistSession(state);

            return toSnapshot(state);
        } catch (RuntimeException ex) {
            incrementCounter(METRIC_ACTION_REJECTED, "reason", classifyActionFailure(ex));
            throw ex;
        }
    }

    private void applyAnswer(SessionState state, Integer tileIndex) {
        if (!PHASE_QUESTION_ACTIVE.equals(state.phase)) {
            throw new IllegalArgumentException("round is not accepting answers");
        }
        if (tileIndex == null) {
            throw new IllegalArgumentException("tileIndex is required for ANSWER");
        }
        if (tileIndex < 0 || tileIndex >= state.pegs.size()) {
            throw new IllegalArgumentException("tileIndex is out of range");
        }

        String playerId = state.currentPlayerId();
        requireActivePlayer(state, playerId);
        incrementCounter(METRIC_ACTION_TOTAL, "type", "answer", "language", state.language);

        PegState peg = state.pegs.get(tileIndex);
        if (!PEG_HIDDEN.equals(peg.state())) {
            throw new IllegalArgumentException("tile already opened");
        }

        boolean correct = isCorrect(state.card, tileIndex);
        if (correct) {
            incrementCounter(METRIC_ANSWER_TOTAL, "outcome", "correct", "language", state.language);
            state.roundScores.put(playerId, (state.roundScores.getOrDefault(playerId, 0)) + 1);
            state.pegs.set(tileIndex, new PegState(tileIndex, PEG_REVEALED));
            if (allCorrectAnswersRevealed(state)) {
                commitRoundScores(state);
                state.phase = PHASE_ROUND_SUCCESS;
                state.lastAction = state.currentPlayerName() + " cleared the board";
                return;
            }
            state.phase = PHASE_QUESTION_ACTIVE;
            state.lastAction = state.currentPlayerName() + " found a correct answer";
        } else {
            incrementCounter(METRIC_ANSWER_TOTAL, "outcome", "wrong", "language", state.language);
            state.statuses.put(playerId, PlayerRoundStatus.OUT);
            state.roundScores.put(playerId, 0);
            state.pegs.set(tileIndex, new PegState(tileIndex, PEG_WRONG));
            state.phase = PHASE_ROUND_FAIL;
            state.lastAction = state.currentPlayerName() + " ended the round with a wrong answer";
        }
    }

    private void applyAdvance(SessionState state) {
        if (!PHASE_ROUND_SUCCESS.equals(state.phase) && !PHASE_ROUND_FAIL.equals(state.phase)) {
            throw new IllegalArgumentException("round is not ready to advance");
        }
        incrementCounter(METRIC_ACTION_TOTAL, "type", "advance", "language", state.language);
        finishRound(state);
    }

    private void finishRound(SessionState state) {
        recordElapsed(METRIC_ROUND_DURATION, state.roundStartedAtMillis, "language", state.language);
        incrementCounter(METRIC_ROUND_COMPLETED, "language", state.language);
        String winnerId = resolveWinner(state);
        if (winnerId != null) {
            state.phase = PHASE_GAME_OVER;
            state.lastAction = playerNameById(state, winnerId) + " reached " + state.winCondition + " points";
            incrementCounter(METRIC_GAME_COMPLETED, "language", state.language);
            recordElapsed(METRIC_GAME_DURATION, state.gameStartedAtMillis, "language", state.language);
            return;
        }

        startNextRound(state);
    }

    private void startNextRound(SessionState state) {
        state.roundNumber += 1;
        state.starterPlayerIndex = (state.starterPlayerIndex + 1) % state.players.size();
        state.activePlayerIndex = state.starterPlayerIndex;
        resetRoundScores(state);
        resetStatuses(state);
        state.card = loadCherryPickCard(state.language, state.gameId, state.topic);
        state.pegs = hiddenPegs(BOARD_ANSWER_COUNT);
        state.phase = PHASE_QUESTION_ACTIVE;
        state.lastAction = "Round " + state.roundNumber + " started";
        state.roundStartedAtMillis = nowMillis();
    }

    private static void commitRoundScores(SessionState state) {
        for (PlayerState player : state.players) {
            String playerId = player.playerId();
            int merged = state.totalScores.getOrDefault(playerId, 0) + state.roundScores.getOrDefault(playerId, 0);
            state.totalScores.put(playerId, merged);
        }
    }

    private static void resetRoundScores(SessionState state) {
        for (PlayerState player : state.players) {
            state.roundScores.put(player.playerId(), 0);
        }
    }

    private static void resetStatuses(SessionState state) {
        for (PlayerState player : state.players) {
            state.statuses.put(player.playerId(), PlayerRoundStatus.ACTIVE);
        }
    }

    private static boolean allCorrectAnswersRevealed(SessionState state) {
        Set<Integer> correctIndexes = resolveCorrectIndexes(state.card.correct() == null ? Map.of() : state.card.correct());
        if (correctIndexes.isEmpty()) {
            throw new IllegalArgumentException("card is missing CherryPick-compatible correct answers");
        }
        for (Integer correctIndex : correctIndexes) {
            if (correctIndex == null || correctIndex < 0 || correctIndex >= state.pegs.size()) {
                throw new IllegalArgumentException("card correct answer is outside 8-answer board");
            }
            if (!PEG_REVEALED.equals(state.pegs.get(correctIndex).state())) {
                return false;
            }
        }
        return true;
    }

    private static String resolveWinner(SessionState state) {
        String winnerId = null;
        int bestScore = Integer.MIN_VALUE;
        for (PlayerState player : state.players) {
            String playerId = player.playerId();
            int score = state.totalScores.getOrDefault(playerId, 0);
            if (score >= state.winCondition && score > bestScore) {
                winnerId = playerId;
                bestScore = score;
            }
        }
        return winnerId;
    }

    private static void requireActivePlayer(SessionState state, String playerId) {
        if (state.statuses.get(playerId) != PlayerRoundStatus.ACTIVE) {
            throw new IllegalArgumentException("current player is not active");
        }
    }

    private static void requireActionActor(SessionState state, String actorPlayerId, String actionToken) {
        String expectedToken = state.actionTokens.get(actorPlayerId);
        if (expectedToken == null) {
            throw new ForbiddenGameActionException("unknown action actor");
        }
        if (!secureEquals(expectedToken, actionToken)) {
            throw new ForbiddenGameActionException("invalid action token");
        }
        if (!actorPlayerId.equals(state.currentPlayerId())) {
            throw new ForbiddenGameActionException("actor is not active player");
        }
    }

    private static void requireUniqueActionRequestId(SessionState state, String actionRequestId) {
        if (state.processedActionRequestIds.contains(actionRequestId)) {
            throw new DuplicateGameActionException("duplicate actionRequestId");
        }
    }

    private static void rememberActionRequestId(SessionState state, String actionRequestId) {
        state.processedActionRequestIds.add(actionRequestId);
        while (state.processedActionRequestIds.size() > ACTION_REQUEST_HISTORY_LIMIT) {
            String oldest = state.processedActionRequestIds.iterator().next();
            state.processedActionRequestIds.remove(oldest);
        }
    }

    private static boolean isCorrect(CardDeckResponse card, int tileIndex) {
        Map<String, Object> correct = card.correct() == null ? Map.of() : card.correct();
        return resolveCorrectIndexes(correct).contains(tileIndex);
    }

    private static Set<Integer> resolveCorrectIndexes(Map<String, Object> correct) {
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

    private static List<PlayerState> buildPlayers(List<String> displayNames) {
        List<PlayerState> players = new ArrayList<>();
        for (int idx = 0; idx < displayNames.size(); idx += 1) {
            players.add(new PlayerState("p" + (idx + 1), displayNames.get(idx)));
        }
        return players;
    }

    private static Map<String, Integer> zeroScores(List<PlayerState> players) {
        Map<String, Integer> scores = new LinkedHashMap<>();
        for (PlayerState player : players) {
            scores.put(player.playerId(), 0);
        }
        return scores;
    }

    private static Map<String, PlayerRoundStatus> activeStatuses(List<PlayerState> players) {
        Map<String, PlayerRoundStatus> statuses = new LinkedHashMap<>();
        for (PlayerState player : players) {
            statuses.put(player.playerId(), PlayerRoundStatus.ACTIVE);
        }
        return statuses;
    }

    private static Map<String, String> issueActionTokens(List<PlayerState> players) {
        Map<String, String> tokens = new LinkedHashMap<>();
        for (PlayerState player : players) {
            tokens.put(player.playerId(), "at_" + UUID.randomUUID().toString().replace("-", ""));
        }
        return tokens;
    }

    private static List<PegState> hiddenPegs(int count) {
        List<PegState> pegs = new ArrayList<>();
        for (int idx = 0; idx < count; idx += 1) {
            pegs.add(new PegState(idx, PEG_HIDDEN));
        }
        return pegs;
    }

    private static String normalizeActionType(String rawType) {
        if (rawType == null || rawType.isBlank()) {
            throw new IllegalArgumentException("type is required");
        }
        return rawType.trim().toUpperCase(Locale.ROOT);
    }

    private static List<String> normalizePlayers(List<String> rawPlayers) {
        if (rawPlayers == null || rawPlayers.isEmpty()) {
            return List.of("Player 1", "Player 2");
        }

        List<String> normalized = rawPlayers.stream()
                .map(GameSessionService::normalizePlayerDisplayName)
                .filter(value -> !value.isBlank())
                .toList();

        if (normalized.size() < MIN_PLAYERS || normalized.size() > MAX_PLAYERS) {
            throw new IllegalArgumentException("players must be between " + MIN_PLAYERS + " and " + MAX_PLAYERS);
        }

        return normalized;
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

    private static int resolveWinCondition(Integer requested) {
        if (requested == null) {
            return DEFAULT_WIN_CONDITION;
        }
        if (requested < 1) {
            throw new IllegalArgumentException("winCondition must be >= 1");
        }
        return requested;
    }

    private static String normalizeLanguage(String language) {
        if (language == null || language.isBlank()) {
            return DEFAULT_LANGUAGE;
        }
        String normalized = language.trim().toLowerCase(Locale.ROOT);
        if (!SUPPORTED_LANGUAGES.contains(normalized)) {
            return DEFAULT_LANGUAGE;
        }
        return normalized;
    }

    private static String normalizeTopic(String topic) {
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

    private static String normalizeRequiredField(String value, String fieldName, int maxLength) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        String normalized = value.trim();
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException(fieldName + " is too long");
        }
        return normalized;
    }

    private static String normalizeActionRequestId(String value) {
        String normalized = normalizeRequiredField(value, "actionRequestId", MAX_ACTION_REQUEST_ID_LENGTH);
        if (!ACTION_REQUEST_ID_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("actionRequestId format is invalid");
        }
        return normalized;
    }

    private static void requireActionTokenFormat(String actionToken) {
        if (!ACTION_TOKEN_PATTERN.matcher(actionToken).matches()) {
            throw new ForbiddenGameActionException("invalid action token");
        }
    }

    private static void requireActorPlayerIdFormat(String actorPlayerId) {
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

    private static boolean secureEquals(String expected, String provided) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                provided.getBytes(StandardCharsets.UTF_8)
        );
    }

    private static boolean containsControlChars(String value) {
        return value.chars().anyMatch(ch -> Character.isISOControl((char) ch));
    }

    private static String classifyActionFailure(RuntimeException ex) {
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

    private static String normalizeMessage(RuntimeException ex) {
        if (ex.getMessage() == null) {
            return "";
        }
        return ex.getMessage().trim().toLowerCase(Locale.ROOT);
    }

    private SessionState requireSession(String gameId, UUID tenantIdContext) {
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
        SessionState state = sessions.get(normalized);
        if (state == null) {
            SessionState stored = loadPersistedSession(normalized);
            if (stored != null) {
                SessionState existing = sessions.putIfAbsent(normalized, stored);
                state = existing == null ? stored : existing;
            }
        }
        if (state == null) {
            throw new NoSuchElementException("game not found: " + normalized);
        }
        assertTenantAccess(state, tenantIdContext);
        if (isExpired(state, nowMillis())) {
            sessions.remove(normalized, state);
            gameSessionStore.delete(normalized);
            incrementCounter(METRIC_SESSION_EVICTED, "reason", "expired");
            throw new NoSuchElementException("game not found: " + normalized);
        }
        return state;
    }

    private static void assertTenantAccess(SessionState state, UUID tenantIdContext) {
        if (tenantIdContext == null || state.tenantId == null) {
            return;
        }
        if (!tenantIdContext.equals(state.tenantId)) {
            throw new ForbiddenTenantAccessException("tenant does not have access to game session");
        }
    }

    private static String playerNameById(SessionState state, String playerId) {
        for (PlayerState player : state.players) {
            if (player.playerId().equals(playerId)) {
                return player.displayName();
            }
        }
        return playerId;
    }

    private void incrementCounter(String metricName, String... tags) {
        meterRegistry.counter(metricName, tags).increment();
    }

    private void recordElapsed(String metricName, long startedAtMillis, String... tags) {
        long now = nowMillis();
        long elapsedMillis = Math.max(0L, now - startedAtMillis);
        meterRegistry.timer(metricName, tags).record(elapsedMillis, TimeUnit.MILLISECONDS);
    }

    private long nowMillis() {
        return clock.millis();
    }

    private String allocateUniqueGameId() {
        for (int attempt = 0; attempt < 10; attempt += 1) {
            String candidate = UUID.randomUUID().toString();
            if (!sessions.containsKey(candidate) && gameSessionStore.read(candidate) == null) {
                return candidate;
            }
        }
        throw new IllegalStateException("failed to allocate gameId");
    }

    private void persistSession(SessionState state) {
        try {
            gameSessionStore.write(state.gameId, objectMapper.writeValueAsString(toStoredSessionState(state)));
        } catch (Exception ex) {
            throw new IllegalStateException("failed to persist game session", ex);
        }
    }

    private SessionState loadPersistedSession(String gameId) {
        String payload = gameSessionStore.read(gameId);
        if (payload == null || payload.isBlank()) {
            return null;
        }
        try {
            StoredGameSessionState stored = objectMapper.readValue(payload, StoredGameSessionState.class);
            return fromStoredSessionState(gameId, stored, nowMillis());
        } catch (Exception ignored) {
            gameSessionStore.delete(gameId);
            return null;
        }
    }

    private void evictExpiredSessions() {
        long nowMillis = nowMillis();
        for (Map.Entry<String, SessionState> entry : sessions.entrySet()) {
            String gameId = entry.getKey();
            SessionState state = entry.getValue();
            if (state == null || !isExpired(state, nowMillis)) {
                continue;
            }
            if (sessions.remove(gameId, state)) {
                gameSessionStore.delete(gameId);
                incrementCounter(METRIC_SESSION_EVICTED, "reason", "expired");
            }
        }
    }

    private void evictOldestUntilCapacityAvailable() {
        while (sessions.size() >= sessionMax) {
            Map.Entry<String, SessionState> oldest = sessions.entrySet().stream()
                    .min(Comparator.comparingLong(entry -> entry.getValue().lastTouchedAtMillis))
                    .orElse(null);
            if (oldest == null) {
                return;
            }
            if (sessions.remove(oldest.getKey(), oldest.getValue())) {
                gameSessionStore.delete(oldest.getKey());
                incrementCounter(METRIC_SESSION_EVICTED, "reason", "capacity");
            }
        }
    }

    private boolean isExpired(SessionState state, long nowMillis) {
        return nowMillis - state.lastTouchedAtMillis >= sessionRetentionMillis;
    }

    private static StoredGameSessionState toStoredSessionState(SessionState state) {
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

    private static SessionState fromStoredSessionState(String gameId, StoredGameSessionState stored, long nowMillis) {
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

        return new SessionState(
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
                || PHASE_ROUND_FAIL.equals(normalized)) {
            return normalized;
        }
        if (PHASE_GAME_OVER.equals(normalized)) {
            return PHASE_GAME_OVER;
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

    private static GameSessionSnapshot toSnapshot(SessionState state) {
        List<PlayerSnapshot> players = state.players.stream()
                .map(player -> new PlayerSnapshot(player.playerId(), player.displayName()))
                .toList();

        List<PegSnapshot> pegs = state.pegs.stream()
                .map(peg -> new PegSnapshot(
                        peg.index(),
                        peg.state(),
                        state.card.options().get(peg.index())
                ))
                .toList();

        Map<String, Integer> totals = new LinkedHashMap<>(state.totalScores);
        Map<String, Integer> rounds = new LinkedHashMap<>(state.roundScores);
        Map<String, PlayerRoundStatus> statuses = new LinkedHashMap<>(state.statuses);

        return new GameSessionSnapshot(
                GameSessionSnapshot.CURRENT_API_VERSION,
                state.gameId,
                state.winCondition,
                state.activePlayerIndex,
                players,
                new RoundStateSnapshot(
                        state.roundNumber,
                        state.phase,
                        state.players.get(state.starterPlayerIndex).playerId(),
                        state.players.get(state.activePlayerIndex).playerId(),
                        state.lastAction
                ),
                new BoardStateSnapshot(
                        state.card.question(),
                        state.card.category(),
                        state.card.topic(),
                        pegs,
                        resolveCorrectIndexes(state.card.correct() == null ? Map.of() : state.card.correct()).stream()
                                .sorted()
                                .toList()
                ),
                totals,
                rounds,
                statuses
        );
    }

    private static final class SessionState {
        private final String gameId;
        private final UUID tenantId;
        private final String hostUserEmail;
        private final String language;
        private final String topic;
        private final int winCondition;
        private final List<PlayerState> players;
        private final Map<String, Integer> totalScores;
        private final Map<String, Integer> roundScores;
        private final Map<String, PlayerRoundStatus> statuses;
        private final Map<String, String> actionTokens;
        private final LinkedHashSet<String> processedActionRequestIds;
        private int roundNumber;
        private int starterPlayerIndex;
        private int activePlayerIndex;
        private String phase;
        private String lastAction;
        private CardDeckResponse card;
        private List<PegState> pegs;
        private final long gameStartedAtMillis;
        private long roundStartedAtMillis;
        private long lastTouchedAtMillis;

        private SessionState(String gameId,
                             UUID tenantId,
                             String hostUserEmail,
                             String language,
                             String topic,
                             int winCondition,
                             List<PlayerState> players,
                             Map<String, Integer> totalScores,
                             Map<String, Integer> roundScores,
                             Map<String, PlayerRoundStatus> statuses,
                             Map<String, String> actionTokens,
                             CardDeckResponse card,
                             long nowMillis) {
            this(
                    gameId,
                    tenantId,
                    hostUserEmail,
                    language,
                    topic,
                    winCondition,
                    players,
                    totalScores,
                    roundScores,
                    statuses,
                    actionTokens,
                    new LinkedHashSet<>(),
                    1,
                    0,
                    0,
                    PHASE_QUESTION_ACTIVE,
                    "Game started",
                    card,
                    hiddenPegs(BOARD_ANSWER_COUNT),
                    nowMillis,
                    nowMillis,
                    nowMillis
            );
        }

        private SessionState(String gameId,
                             UUID tenantId,
                             String hostUserEmail,
                             String language,
                             String topic,
                             int winCondition,
                             List<PlayerState> players,
                             Map<String, Integer> totalScores,
                             Map<String, Integer> roundScores,
                             Map<String, PlayerRoundStatus> statuses,
                             Map<String, String> actionTokens,
                             LinkedHashSet<String> processedActionRequestIds,
                             int roundNumber,
                             int starterPlayerIndex,
                             int activePlayerIndex,
                             String phase,
                             String lastAction,
                             CardDeckResponse card,
                             List<PegState> pegs,
                             long gameStartedAtMillis,
                             long roundStartedAtMillis,
                             long lastTouchedAtMillis) {
            this.gameId = gameId;
            this.tenantId = tenantId;
            this.hostUserEmail = hostUserEmail;
            this.language = language;
            this.topic = topic;
            this.winCondition = winCondition;
            this.players = players;
            this.totalScores = totalScores;
            this.roundScores = roundScores;
            this.statuses = statuses;
            this.actionTokens = actionTokens;
            this.processedActionRequestIds = processedActionRequestIds;
            this.roundNumber = roundNumber;
            this.starterPlayerIndex = starterPlayerIndex;
            this.activePlayerIndex = activePlayerIndex;
            this.phase = phase;
            this.lastAction = lastAction;
            this.card = card;
            this.pegs = pegs;
            this.gameStartedAtMillis = gameStartedAtMillis;
            this.roundStartedAtMillis = roundStartedAtMillis;
            this.lastTouchedAtMillis = lastTouchedAtMillis;
        }

        private String currentPlayerId() {
            return players.get(activePlayerIndex).playerId();
        }

        private String currentPlayerName() {
            return players.get(activePlayerIndex).displayName();
        }
    }

    private record PlayerState(String playerId, String displayName) {
    }

    private record PegState(int index, String state) {
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
