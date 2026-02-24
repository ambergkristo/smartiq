package com.smartiq.backend.game;

import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.card.CardService;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
public class GameSessionService {

    private static final int DEFAULT_WIN_CONDITION = 30;
    private static final int MIN_PLAYERS = 2;
    private static final int MAX_PLAYERS = 8;
    private static final String DEFAULT_LANGUAGE = "en";
    private static final String PHASE_CHOOSING = "CHOOSING";
    private static final String PHASE_GAME_OVER = "GAME_OVER";
    private static final String PEG_HIDDEN = "hidden";
    private static final String PEG_REVEALED = "revealed";
    private static final String PEG_WRONG = "wrong";

    private final CardService cardService;
    private final ConcurrentMap<String, SessionState> sessions = new ConcurrentHashMap<>();

    public GameSessionService(CardService cardService) {
        this.cardService = cardService;
    }

    public synchronized GameSessionSnapshot createGame(CreateGameRequest request) {
        List<String> displayNames = normalizePlayers(request == null ? null : request.players());
        int winCondition = resolveWinCondition(request == null ? null : request.winCondition());
        String language = normalizeLanguage(request == null ? null : request.language());
        String topic = normalizeTopic(request == null ? null : request.topic());

        String gameId = UUID.randomUUID().toString();
        List<PlayerState> players = buildPlayers(displayNames);
        Map<String, Integer> totals = zeroScores(players);
        Map<String, Integer> roundScores = zeroScores(players);
        Map<String, PlayerRoundStatus> statuses = activeStatuses(players);
        CardDeckResponse card = cardService.getNextRandomCard(language, gameId, topic);

        SessionState state = new SessionState(
                gameId,
                language,
                topic,
                winCondition,
                players,
                totals,
                roundScores,
                statuses,
                card
        );
        sessions.put(gameId, state);

        return toSnapshot(state);
    }

    public synchronized GameSessionSnapshot getSnapshot(String gameId) {
        SessionState state = requireSession(gameId);
        return toSnapshot(state);
    }

    public synchronized GameSessionSnapshot applyAction(String gameId, GameActionRequest request) {
        SessionState state = requireSession(gameId);
        if (request == null) {
            throw new IllegalArgumentException("action payload is required");
        }
        if (PHASE_GAME_OVER.equals(state.phase)) {
            throw new IllegalArgumentException("game already ended");
        }

        String actionType = normalizeActionType(request.type());
        switch (actionType) {
            case "PASS" -> applyPass(state);
            case "ANSWER" -> applyAnswer(state, request.tileIndex(), request.rank());
            default -> throw new IllegalArgumentException("unsupported action type: " + actionType);
        }

        return toSnapshot(state);
    }

    private void applyPass(SessionState state) {
        String playerId = state.currentPlayerId();
        requireActivePlayer(state, playerId);
        state.statuses.put(playerId, PlayerRoundStatus.PASSED);
        state.lastAction = state.currentPlayerName() + " passed";
        advanceOrFinishRound(state);
    }

    private void applyAnswer(SessionState state, Integer tileIndex, Integer rank) {
        if (tileIndex == null) {
            throw new IllegalArgumentException("tileIndex is required for ANSWER");
        }
        if (tileIndex < 0 || tileIndex >= state.pegs.size()) {
            throw new IllegalArgumentException("tileIndex is out of range");
        }

        String playerId = state.currentPlayerId();
        requireActivePlayer(state, playerId);

        PegState peg = state.pegs.get(tileIndex);
        if (!PEG_HIDDEN.equals(peg.state())) {
            throw new IllegalArgumentException("tile already opened");
        }

        boolean correct = isCorrect(state.card, tileIndex, rank);
        if (correct) {
            state.roundScores.put(playerId, (state.roundScores.getOrDefault(playerId, 0)) + 1);
            state.pegs.set(tileIndex, new PegState(tileIndex, PEG_REVEALED));
            state.lastAction = state.currentPlayerName() + " answered correctly (+1)";
        } else {
            state.statuses.put(playerId, PlayerRoundStatus.OUT);
            state.pegs.set(tileIndex, new PegState(tileIndex, PEG_WRONG));
            state.lastAction = state.currentPlayerName() + " answered wrong (dropped)";
        }

        advanceOrFinishRound(state);
    }

    private void advanceOrFinishRound(SessionState state) {
        if (roundEnded(state)) {
            finishRound(state);
            return;
        }

        int nextIndex = nextActiveIndex(state, state.activePlayerIndex);
        if (nextIndex < 0) {
            finishRound(state);
            return;
        }

        state.activePlayerIndex = nextIndex;
        state.phase = PHASE_CHOOSING;
    }

    private void finishRound(SessionState state) {
        commitRoundScores(state);
        String winnerId = resolveWinner(state);
        if (winnerId != null) {
            state.phase = PHASE_GAME_OVER;
            state.lastAction = playerNameById(state, winnerId) + " reached " + state.winCondition + " points";
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
        state.card = cardService.getNextRandomCard(state.language, state.gameId, state.topic);
        state.pegs = hiddenPegs(state.card.options().size());
        state.phase = PHASE_CHOOSING;
        state.lastAction = "Round " + state.roundNumber + " started";
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

    private static boolean roundEnded(SessionState state) {
        boolean allPegsResolved = state.pegs.stream().noneMatch(peg -> PEG_HIDDEN.equals(peg.state()));
        if (allPegsResolved) {
            return true;
        }
        return state.players.stream().noneMatch(player -> state.statuses.get(player.playerId()) == PlayerRoundStatus.ACTIVE);
    }

    private static int nextActiveIndex(SessionState state, int fromIndex) {
        if (state.players.isEmpty()) {
            return -1;
        }
        for (int step = 1; step <= state.players.size(); step += 1) {
            int idx = (fromIndex + step) % state.players.size();
            String playerId = state.players.get(idx).playerId();
            if (state.statuses.get(playerId) == PlayerRoundStatus.ACTIVE) {
                return idx;
            }
        }
        return -1;
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

    private static boolean isCorrect(CardDeckResponse card, int tileIndex, Integer rank) {
        String category = normalizeCategory(card.category());
        Map<String, Object> correct = card.correct() == null ? Map.of() : card.correct();

        return switch (category) {
            case "NUMBER", "CENTURY_DECADE", "COLOR" -> {
                Integer correctIndex = asInteger(correct.get("correctIndex"));
                if (correctIndex == null) {
                    Set<Integer> indexes = resolveCorrectIndexes(correct);
                    yield indexes.size() == 1 && indexes.contains(tileIndex);
                }
                yield correctIndex == tileIndex;
            }
            case "ORDER" -> {
                List<Integer> rankByIndex = asIntegerList(correct.get("rankByIndex"));
                if (rankByIndex.isEmpty()) {
                    throw new IllegalArgumentException("ORDER card is missing rankByIndex metadata");
                }
                if (rank == null) {
                    throw new IllegalArgumentException("rank is required for ORDER answers");
                }
                if (rank < 1 || rank > rankByIndex.size()) {
                    throw new IllegalArgumentException("rank is out of range");
                }
                yield rankByIndex.get(tileIndex) == rank;
            }
            default -> resolveCorrectIndexes(correct).contains(tileIndex);
        };
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

    private static String normalizeCategory(String category) {
        if (category == null || category.isBlank()) {
            return "OPEN";
        }
        return category.trim().toUpperCase(Locale.ROOT);
    }

    private static List<String> normalizePlayers(List<String> rawPlayers) {
        if (rawPlayers == null || rawPlayers.isEmpty()) {
            return List.of("Player 1", "Player 2");
        }

        List<String> normalized = rawPlayers.stream()
                .map(value -> value == null ? "" : value.trim())
                .filter(value -> !value.isBlank())
                .toList();

        if (normalized.size() < MIN_PLAYERS || normalized.size() > MAX_PLAYERS) {
            throw new IllegalArgumentException("players must be between " + MIN_PLAYERS + " and " + MAX_PLAYERS);
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
        return language.trim().toLowerCase(Locale.ROOT);
    }

    private static String normalizeTopic(String topic) {
        if (topic == null || topic.isBlank()) {
            return null;
        }
        return topic.trim();
    }

    private SessionState requireSession(String gameId) {
        if (gameId == null || gameId.isBlank()) {
            throw new IllegalArgumentException("gameId is required");
        }
        SessionState state = sessions.get(gameId.trim());
        if (state == null) {
            throw new NoSuchElementException("game not found: " + gameId.trim());
        }
        return state;
    }

    private static String playerNameById(SessionState state, String playerId) {
        for (PlayerState player : state.players) {
            if (player.playerId().equals(playerId)) {
                return player.displayName();
            }
        }
        return playerId;
    }

    private static GameSessionSnapshot toSnapshot(SessionState state) {
        List<PlayerSnapshot> players = state.players.stream()
                .map(player -> new PlayerSnapshot(player.playerId(), player.displayName()))
                .toList();

        List<PegSnapshot> pegs = state.pegs.stream()
                .map(peg -> new PegSnapshot(
                        peg.index(),
                        peg.state(),
                        PEG_HIDDEN.equals(peg.state()) ? null : state.card.options().get(peg.index())
                ))
                .toList();

        Map<String, Integer> totals = new LinkedHashMap<>(state.totalScores);
        Map<String, Integer> rounds = new LinkedHashMap<>(state.roundScores);
        Map<String, PlayerRoundStatus> statuses = new LinkedHashMap<>(state.statuses);

        return new GameSessionSnapshot(
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
                        pegs
                ),
                totals,
                rounds,
                statuses
        );
    }

    private static final class SessionState {
        private final String gameId;
        private final String language;
        private final String topic;
        private final int winCondition;
        private final List<PlayerState> players;
        private final Map<String, Integer> totalScores;
        private final Map<String, Integer> roundScores;
        private final Map<String, PlayerRoundStatus> statuses;
        private int roundNumber;
        private int starterPlayerIndex;
        private int activePlayerIndex;
        private String phase;
        private String lastAction;
        private CardDeckResponse card;
        private List<PegState> pegs;

        private SessionState(String gameId,
                             String language,
                             String topic,
                             int winCondition,
                             List<PlayerState> players,
                             Map<String, Integer> totalScores,
                             Map<String, Integer> roundScores,
                             Map<String, PlayerRoundStatus> statuses,
                             CardDeckResponse card) {
            this.gameId = gameId;
            this.language = language;
            this.topic = topic;
            this.winCondition = winCondition;
            this.players = players;
            this.totalScores = totalScores;
            this.roundScores = roundScores;
            this.statuses = statuses;
            this.roundNumber = 1;
            this.starterPlayerIndex = 0;
            this.activePlayerIndex = 0;
            this.phase = PHASE_CHOOSING;
            this.lastAction = "Game started";
            this.card = card;
            this.pegs = hiddenPegs(card.options().size());
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
}
