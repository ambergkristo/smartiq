package com.smartiq.backend.game;

import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.card.CardService;
import com.smartiq.backend.config.GameSessionProperties;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameSessionServiceTest {

    @Mock
    private CardService cardService;

    private SimpleMeterRegistry meterRegistry;
    private GameSessionService gameSessionService;
    private MutableClock testClock;

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        testClock = new MutableClock(Instant.parse("2026-02-25T00:00:00Z"), ZoneOffset.UTC);
        gameSessionService = new GameSessionService(
                cardService,
                meterRegistry,
                new GameSessionProperties(180, 50000),
                testClock
        );
    }

    @Test
    void createGameInitializesSnapshot() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        GameSessionSnapshot snapshot = created.snapshot();

        assertThat(snapshot.gameId()).isNotBlank();
        assertThat(snapshot.winCondition()).isEqualTo(30);
        assertThat(snapshot.roundState().roundNumber()).isEqualTo(1);
        assertThat(snapshot.roundState().phase()).isEqualTo("CHOOSING");
        assertThat(snapshot.players()).hasSize(2);
        assertThat(snapshot.players().get(0).playerId()).isEqualTo("p1");
        assertThat(snapshot.players().get(0).displayName()).isEqualTo("Alice");
        assertThat(snapshot.boardState().pegs()).hasSize(10);
        assertThat(snapshot.boardState().pegs().get(0).state()).isEqualTo("hidden");
        assertThat(snapshot.statuses().get("p1")).isEqualTo(PlayerRoundStatus.ACTIVE);
        assertThat(snapshot.statuses().get("p2")).isEqualTo(PlayerRoundStatus.ACTIVE);
        assertThat(created.actionTokens()).containsKeys("p1", "p2");
    }

    @Test
    void createGameFallsBackToDefaultLanguageForUnsupportedTag() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "de-DE", null, 30)
        );

        verify(cardService).getNextRandomCard(eq("en"), anyString(), eq(null));
        assertThat(counterValue("smartiq.game.session.started.total")).isEqualTo(1.0);
    }

    @Test
    void passMarksPlayerAndMovesTurn() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCardWithCorrectIndexes("card-1", List.of(0, 1), "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p1Token = created.actionTokens().get("p1");
        String p2Token = created.actionTokens().get("p2");
        String gameId = created.snapshot().gameId();

        gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-pass-0")
        );
        gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 1, null, "p2", p2Token, "req-pass-0b")
        );
        GameSessionSnapshot afterPass = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-pass-1")
        );

        assertThat(afterPass.statuses().get("p1")).isEqualTo(PlayerRoundStatus.PASSED);
        assertThat(afterPass.roundState().currentPlayerId()).isEqualTo("p2");
        assertThat(afterPass.roundState().phase()).isEqualTo("CHOOSING");
    }

    @Test
    void wrongAnswerDropsCurrentPlayer() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p1Token = created.actionTokens().get("p1");

        GameSessionSnapshot afterAnswer = gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("ANSWER", 1, null, "p1", p1Token, "req-answer-1")
        );

        assertThat(afterAnswer.statuses().get("p1")).isEqualTo(PlayerRoundStatus.OUT);
        assertThat(afterAnswer.roundState().currentPlayerId()).isEqualTo("p2");
        assertThat(afterAnswer.boardState().pegs().get(1).state()).isEqualTo("wrong");
    }

    @Test
    void roundEndsAndStartsNextRoundWhenNoActivePlayersRemain() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCard("card-1", 0, "Question 1"),
                        openCard("card-2", 0, "Question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String p1Token = created.actionTokens().get("p1");
        String p2Token = created.actionTokens().get("p2");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-round-0"));
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 1, null, "p2", p2Token, "req-round-1"));
        GameSessionSnapshot nextRound = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-round-2")
        );

        assertThat(nextRound.roundState().roundNumber()).isEqualTo(2);
        assertThat(nextRound.roundState().starterPlayerId()).isEqualTo("p2");
        assertThat(nextRound.roundState().currentPlayerId()).isEqualTo("p2");
        assertThat(nextRound.roundState().phase()).isEqualTo("CHOOSING");
        assertThat(nextRound.boardState().question()).isEqualTo("Question 2");
        assertThat(nextRound.roundScores().get("p1")).isEqualTo(0);
        assertThat(nextRound.roundScores().get("p2")).isEqualTo(0);
        assertThat(nextRound.statuses().get("p1")).isEqualTo(PlayerRoundStatus.ACTIVE);
        assertThat(nextRound.statuses().get("p2")).isEqualTo(PlayerRoundStatus.ACTIVE);
        verify(cardService, times(2)).getNextRandomCard(eq("en"), anyString(), eq(null));
    }

    @Test
    void gameEndsWhenWinConditionIsReachedAfterRoundCommit() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 1)
        );
        String gameId = created.snapshot().gameId();
        String p1Token = created.actionTokens().get("p1");
        String p2Token = created.actionTokens().get("p2");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-win-1"));
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 1, null, "p2", p2Token, "req-win-2"));
        GameSessionSnapshot gameOver = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-win-3")
        );

        assertThat(gameOver.roundState().phase()).isEqualTo("GAME_OVER");
        assertThat(gameOver.totalScores().get("p1")).isEqualTo(1);
        assertThat(gameOver.roundState().lastAction()).isEqualTo("Alice reached 1 points");
        verify(cardService, times(1)).getNextRandomCard(eq("en"), anyString(), eq(null));
    }

    @Test
    void orderCategoryRequiresRankForAnswerValidation() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(orderCard("order-1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p1Token = created.actionTokens().get("p1");

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-order-1")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("rank is required for ORDER answers");
    }

    @Test
    void cannotAnswerAlreadyOpenedTile() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String p1Token = created.actionTokens().get("p1");
        String p2Token = created.actionTokens().get("p2");
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-opened-1"));

        assertThatThrownBy(() -> gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 0, null, "p2", p2Token, "req-opened-2")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("tile already opened");
    }

    @Test
    void supportsSinglePlayerSessions() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCard("single-1", 0, "Solo question 1"),
                        openCard("single-2", 0, "Solo question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        GameSessionSnapshot createdSnapshot = created.snapshot();
        String p1Token = created.actionTokens().get("p1");

        assertThat(createdSnapshot.players()).hasSize(1);
        assertThat(createdSnapshot.players().get(0).displayName()).isEqualTo("Alice");
        assertThat(createdSnapshot.roundState().currentPlayerId()).isEqualTo("p1");

        gameSessionService.applyAction(
                createdSnapshot.gameId(),
                new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-single-0")
        );
        GameSessionSnapshot nextRound = gameSessionService.applyAction(
                createdSnapshot.gameId(),
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-single-1")
        );

        assertThat(nextRound.roundState().roundNumber()).isEqualTo(2);
        assertThat(nextRound.roundState().starterPlayerId()).isEqualTo("p1");
        assertThat(nextRound.roundState().currentPlayerId()).isEqualTo("p1");
        assertThat(nextRound.roundState().phase()).isEqualTo("CHOOSING");
        assertThat(nextRound.statuses().get("p1")).isEqualTo(PlayerRoundStatus.ACTIVE);
        verify(cardService, times(2)).getNextRandomCard(eq("en"), anyString(), eq(null));
    }

    @Test
    void recordsGameplayTelemetryForBetaMetrics() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("metric-1", 0, "Telemetry question"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 1)
        );
        String gameId = created.snapshot().gameId();
        String p1Token = created.actionTokens().get("p1");
        String p2Token = created.actionTokens().get("p2");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-metric-1"));
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 1, null, "p2", p2Token, "req-metric-2"));
        gameSessionService.applyAction(gameId, new GameActionRequest("PASS", null, null, "p1", p1Token, "req-metric-3"));

        assertThat(counterValue("smartiq.game.session.started.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.session.completed.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.round.completed.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.action.total", "type", "answer")).isEqualTo(2.0);
        assertThat(counterValue("smartiq.game.action.total", "type", "pass")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.answer.total", "outcome", "correct")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.answer.total", "outcome", "wrong")).isEqualTo(1.0);
        assertThat(timerCount("smartiq.game.round.duration.seconds")).isEqualTo(1L);
        assertThat(timerCount("smartiq.game.duration.seconds")).isEqualTo(1L);
    }

    @Test
    void rejectsActionWithInvalidToken() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p1", "at_invalid", "req-invalid-token")
        ))
                .isInstanceOf(ForbiddenGameActionException.class)
                .hasMessage("invalid action token");
        assertThat(rejectedCounterValue("invalid_action_token")).isEqualTo(1.0);
    }

    @Test
    void rejectsActionWithInvalidActorPlayerIdFormat() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "player-1", created.actionTokens().get("p1"), "req-invalid-actor")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actorPlayerId format is invalid");
    }

    @Test
    void rejectsActionWithOverflowActorPlayerIdFormat() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p99999999999999999999", created.actionTokens().get("p1"), "req-overflow-actor")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actorPlayerId format is invalid");
        assertThat(rejectedCounterValue("invalid_actor_player_id")).isEqualTo(1.0);
    }

    @Test
    void rejectsActionWithOversizedActorPlayerId() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p" + "1".repeat(64), created.actionTokens().get("p1"), "req-oversized-actor")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actorPlayerId is too long");
        assertThat(rejectedCounterValue("invalid_actor_player_id")).isEqualTo(1.0);
    }

    @Test
    void rejectsActionWhenActorIsNotActivePlayer() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p2Token = created.actionTokens().get("p2");

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p2", p2Token, "req-wrong-actor")
        ))
                .isInstanceOf(ForbiddenGameActionException.class)
                .hasMessage("actor is not active player");
    }

    @Test
    void rejectsDuplicateActionRequestId() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCard("card-1", 0, "Question 1"),
                        openCard("card-2", 0, "Question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String p1Token = created.actionTokens().get("p1");

        gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 0, null, "p1", p1Token, "req-dup-0")
        );
        gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-dup-1")
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-dup-1")
        ))
                .isInstanceOf(DuplicateGameActionException.class)
                .hasMessage("duplicate actionRequestId");
    }

    @Test
    void rejectsPassBeforeAnyCorrectAnswerInRound() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p1Token = created.actionTokens().get("p1");

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p1", p1Token, "req-pass-denied-1")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("pass requires at least one correct answer in current round");
    }

    @Test
    void rejectsOversizedActionRequestId() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String oversized = "r".repeat(129);

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p1", created.actionTokens().get("p1"), oversized)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actionRequestId is too long");
    }

    @Test
    void rejectsActionRequestIdWithInvalidFormat() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p1", created.actionTokens().get("p1"), "req bad")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("actionRequestId format is invalid");
    }

    @Test
    void rejectsOversizedGameIdOnSnapshotAccess() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.getSnapshot("g".repeat(129)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("gameId is too long");
    }

    @Test
    void rejectsOversizedGameIdForActionSubmission() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                "g".repeat(129),
                new GameActionRequest("PASS", null, null, "p1", created.actionTokens().get("p1"), "req-oversized-game-id")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("gameId is too long");
        assertThat(rejectedCounterValue("invalid_request")).isEqualTo(1.0);
    }

    @Test
    void createGameRejectsOversizedPlayerDisplayName() {
        assertThatThrownBy(() -> gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("A".repeat(65), "Bob"), "en", null, 30)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("player displayName is too long");
    }

    @Test
    void createGameRejectsOversizedTopic() {
        assertThatThrownBy(() -> gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", "T".repeat(129), 30)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("topic is too long");
    }

    @Test
    void createGameRejectsTopicWithControlCharacters() {
        assertThatThrownBy(() -> gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", "Science\nMath", 30)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("topic contains control characters");
    }

    @Test
    void createGameRejectsPlayerDisplayNameWithControlCharacters() {
        assertThatThrownBy(() -> gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice\nBob", "Carol"), "en", null, 30)
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("player displayName contains control characters");
    }

    @Test
    void evictsExpiredSessionsOnAccess() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("ttl-card-1", 0, "TTL Question 1"));

        GameSessionService ttlService = new GameSessionService(
                cardService,
                meterRegistry,
                new GameSessionProperties(1, 50000),
                testClock
        );
        GameSessionCreateResponse created = ttlService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();

        testClock.advanceSeconds(61);

        assertThatThrownBy(() -> ttlService.getSnapshot(gameId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("game not found: " + gameId);
        assertThat(evictedCounterValue("expired")).isEqualTo(1.0);
    }

    @Test
    void evictsOldestSessionWhenCapacityReached() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCard("cap-card-1", 0, "Capacity Question 1"),
                        openCard("cap-card-2", 0, "Capacity Question 2")
                );

        GameSessionService capService = new GameSessionService(
                cardService,
                meterRegistry,
                new GameSessionProperties(180, 1),
                testClock
        );
        GameSessionCreateResponse first = capService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String firstGameId = first.snapshot().gameId();

        testClock.advanceSeconds(1);

        GameSessionCreateResponse second = capService.createGameWithControl(
                new CreateGameRequest(List.of("Carol", "Dave"), "en", null, 30)
        );

        assertThatThrownBy(() -> capService.getSnapshot(firstGameId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("game not found: " + firstGameId);
        assertThat(capService.getSnapshot(second.snapshot().gameId()).gameId()).isEqualTo(second.snapshot().gameId());
        assertThat(evictedCounterValue("capacity")).isEqualTo(1.0);
    }

    private double counterValue(String name, String... tags) {
        var counter = meterRegistry.find(name).tags(tags).tag("language", "en").counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private long timerCount(String name) {
        var timer = meterRegistry.find(name).tag("language", "en").timer();
        if (timer == null) {
            return 0L;
        }
        return timer.count();
    }

    private double evictedCounterValue(String reason) {
        var counter = meterRegistry.find("smartiq.game.session.evicted.total").tag("reason", reason).counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private double rejectedCounterValue(String reason) {
        var counter = meterRegistry.find("smartiq.game.action.rejected.total").tag("reason", reason).counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private static CardDeckResponse openCard(String cardId, int correctIndex, String question) {
        return new CardDeckResponse(
                cardId,
                "OPEN",
                "Science",
                "en",
                question,
                options(),
                Map.of("correctIndexes", List.of(correctIndex)),
                "smartiq-v2",
                null
        );
    }

    private static CardDeckResponse openCardWithCorrectIndexes(String cardId, List<Integer> correctIndexes, String question) {
        return new CardDeckResponse(
                cardId,
                "OPEN",
                "Science",
                "en",
                question,
                options(),
                Map.of("correctIndexes", correctIndexes),
                "smartiq-v2",
                null
        );
    }

    private static CardDeckResponse orderCard(String cardId) {
        return new CardDeckResponse(
                cardId,
                "ORDER",
                "History",
                "en",
                "Order timeline",
                options(),
                Map.of("rankByIndex", List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10)),
                "smartiq-v2",
                null
        );
    }

    private static List<String> options() {
        return List.of("A", "B", "C", "D", "E", "F", "G", "H", "I", "J");
    }

    private static final class MutableClock extends Clock {
        private Instant instant;
        private final ZoneId zone;

        private MutableClock(Instant instant, ZoneId zone) {
            this.instant = instant;
            this.zone = zone;
        }

        @Override
        public ZoneId getZone() {
            return zone;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return new MutableClock(instant, zone);
        }

        @Override
        public Instant instant() {
            return instant;
        }

        private void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }
    }
}
