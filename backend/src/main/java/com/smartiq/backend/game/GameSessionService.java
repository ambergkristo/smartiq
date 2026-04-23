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

import static com.smartiq.backend.game.GameSessionSupport.activeStatuses;
import static com.smartiq.backend.game.GameSessionSupport.assertTenantAccess;
import static com.smartiq.backend.game.GameSessionSupport.buildPlayers;
import static com.smartiq.backend.game.GameSessionSupport.classifyActionFailure;
import static com.smartiq.backend.game.GameSessionSupport.hiddenPegs;
import static com.smartiq.backend.game.GameSessionSupport.isCorrect;
import static com.smartiq.backend.game.GameSessionSupport.issueActionTokens;
import static com.smartiq.backend.game.GameSessionSupport.normalizeActionRequestId;
import static com.smartiq.backend.game.GameSessionSupport.normalizeActionType;
import static com.smartiq.backend.game.GameSessionSupport.normalizeLanguage;
import static com.smartiq.backend.game.GameSessionSupport.normalizeOptionalHostUserEmail;
import static com.smartiq.backend.game.GameSessionSupport.normalizePlayers;
import static com.smartiq.backend.game.GameSessionSupport.normalizeRequiredField;
import static com.smartiq.backend.game.GameSessionSupport.normalizeTopic;
import static com.smartiq.backend.game.GameSessionSupport.playerNameById;
import static com.smartiq.backend.game.GameSessionSupport.requireActionTokenFormat;
import static com.smartiq.backend.game.GameSessionSupport.requireActorPlayerIdFormat;
import static com.smartiq.backend.game.GameSessionSupport.resolveCorrectIndexes;
import static com.smartiq.backend.game.GameSessionSupport.resolveWinCondition;
import static com.smartiq.backend.game.GameSessionSupport.secureEquals;
import static com.smartiq.backend.game.GameSessionSupport.validateGameId;
import static com.smartiq.backend.game.GameSessionSupport.zeroScores;

@Service
public class GameSessionService {

    private static final int DEFAULT_WIN_CONDITION = 30;
    private static final int BOARD_ANSWER_COUNT = 8;
    private static final int MAX_CARD_FETCH_ATTEMPTS = 24;
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
    private static final int MAX_PLAYER_ID_LENGTH = 64;
    private static final int MAX_ACTION_TOKEN_LENGTH = 128;
    private static final int DEFAULT_SESSION_RETENTION_MINUTES = 180;
    private static final int DEFAULT_SESSION_MAX = 50000;

    private final CardService cardService;
    private final MeterRegistry meterRegistry;
    private final GameSessionStore gameSessionStore;
    private final GameSessionStateCodec gameSessionStateCodec;
    private final Clock clock;
    private final long sessionRetentionMillis;
    private final int sessionMax;
    private final ConcurrentMap<String, GameSessionState> sessions = new ConcurrentHashMap<>();

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
        this.gameSessionStateCodec = new GameSessionStateCodec(objectMapper);
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
        GameSessionState state = createSession(request, tenantId, hostUserEmail);
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
        GameSessionState state = requireSession(gameId, tenantIdContext);
        List<String> players = state.players.stream()
                .map(PlayerState::displayName)
                .toList();
        return new CreateGameRequest(players, state.language, state.topic, state.winCondition, null, null, null);
    }

    public synchronized GameSessionCreateResponse duplicateGameWithControl(String gameId,
                                                                           UUID tenantIdContext,
                                                                           String hostUserEmail) {
        CreateGameRequest request = buildDuplicateRequest(gameId, tenantIdContext);
        return createGameWithControl(request, tenantIdContext, hostUserEmail);
    }

    public synchronized GameSessionCreateResponse getGameWithControl(String gameId, UUID tenantIdContext) {
        evictExpiredSessions();
        GameSessionState state = requireSession(gameId, tenantIdContext);
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

    private GameSessionState createSession(CreateGameRequest request, UUID tenantId, String hostUserEmail) {
        List<String> displayNames = normalizePlayers(request == null ? null : request.players());
        int winCondition = resolveWinCondition(request == null ? null : request.winCondition(), DEFAULT_WIN_CONDITION);
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

        GameSessionState state = new GameSessionState(
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
                hiddenPegs(BOARD_ANSWER_COUNT),
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
        GameSessionState state = requireSession(gameId, tenantIdContext);
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
            GameSessionState state = requireSession(gameId, tenantIdContext);
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

    private void applyAnswer(GameSessionState state, Integer tileIndex) {
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

    private void applyAdvance(GameSessionState state) {
        if (!PHASE_ROUND_SUCCESS.equals(state.phase) && !PHASE_ROUND_FAIL.equals(state.phase)) {
            throw new IllegalArgumentException("round is not ready to advance");
        }
        incrementCounter(METRIC_ACTION_TOTAL, "type", "advance", "language", state.language);
        finishRound(state);
    }

    private void finishRound(GameSessionState state) {
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

    private void startNextRound(GameSessionState state) {
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

    private static void commitRoundScores(GameSessionState state) {
        for (PlayerState player : state.players) {
            String playerId = player.playerId();
            int merged = state.totalScores.getOrDefault(playerId, 0) + state.roundScores.getOrDefault(playerId, 0);
            state.totalScores.put(playerId, merged);
        }
    }

    private static void resetRoundScores(GameSessionState state) {
        for (PlayerState player : state.players) {
            state.roundScores.put(player.playerId(), 0);
        }
    }

    private static void resetStatuses(GameSessionState state) {
        for (PlayerState player : state.players) {
            state.statuses.put(player.playerId(), PlayerRoundStatus.ACTIVE);
        }
    }

    private static boolean allCorrectAnswersRevealed(GameSessionState state) {
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

    private static String resolveWinner(GameSessionState state) {
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

    private static void requireActivePlayer(GameSessionState state, String playerId) {
        if (state.statuses.get(playerId) != PlayerRoundStatus.ACTIVE) {
            throw new IllegalArgumentException("current player is not active");
        }
    }

    private static void requireActionActor(GameSessionState state, String actorPlayerId, String actionToken) {
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

    private static void requireUniqueActionRequestId(GameSessionState state, String actionRequestId) {
        if (state.processedActionRequestIds.contains(actionRequestId)) {
            throw new DuplicateGameActionException("duplicate actionRequestId");
        }
    }

    private static void rememberActionRequestId(GameSessionState state, String actionRequestId) {
        state.processedActionRequestIds.add(actionRequestId);
        while (state.processedActionRequestIds.size() > ACTION_REQUEST_HISTORY_LIMIT) {
            String oldest = state.processedActionRequestIds.iterator().next();
            state.processedActionRequestIds.remove(oldest);
        }
    }

    private GameSessionState requireSession(String gameId, UUID tenantIdContext) {
        validateGameId(gameId);
        String normalized = gameId.trim();
        GameSessionState state = sessions.get(normalized);
        if (state == null) {
            GameSessionState stored = loadPersistedSession(normalized);
            if (stored != null) {
                GameSessionState existing = sessions.putIfAbsent(normalized, stored);
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

    private void persistSession(GameSessionState state) {
        try {
            gameSessionStore.write(state.gameId, gameSessionStateCodec.serialize(state));
        } catch (Exception ex) {
            throw new IllegalStateException("failed to persist game session", ex);
        }
    }

    private GameSessionState loadPersistedSession(String gameId) {
        String payload = gameSessionStore.read(gameId);
        if (payload == null || payload.isBlank()) {
            return null;
        }
        try {
            return gameSessionStateCodec.deserialize(gameId, payload, nowMillis());
        } catch (Exception ignored) {
            gameSessionStore.delete(gameId);
            return null;
        }
    }

    private void evictExpiredSessions() {
        long nowMillis = nowMillis();
        for (Map.Entry<String, GameSessionState> entry : sessions.entrySet()) {
            String gameId = entry.getKey();
            GameSessionState state = entry.getValue();
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
            Map.Entry<String, GameSessionState> oldest = sessions.entrySet().stream()
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

    private boolean isExpired(GameSessionState state, long nowMillis) {
        return nowMillis - state.lastTouchedAtMillis >= sessionRetentionMillis;
    }

    private static GameSessionSnapshot toSnapshot(GameSessionState state) {
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

}
