package com.smartiq.backend.game;

import com.smartiq.backend.card.CardDeckResponse;
import com.smartiq.backend.card.CardService;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;

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

    @BeforeEach
    void setUp() {
        meterRegistry = new SimpleMeterRegistry();
        gameSessionService = new GameSessionService(cardService, meterRegistry);
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
    void passMarksPlayerAndMovesTurn() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCard("card-1", 0, "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
        );
        String p1Token = created.actionTokens().get("p1");

        GameSessionSnapshot afterPass = gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, null, "p1", p1Token)
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
                new GameActionRequest("ANSWER", 1, null, "p1", p1Token)
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

        gameSessionService.applyAction(gameId, new GameActionRequest("PASS", null, null, "p1", p1Token));
        GameSessionSnapshot nextRound = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 1, null, "p2", p2Token)
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

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token));
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 1, null, "p2", p2Token));
        GameSessionSnapshot gameOver = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("PASS", null, null, "p1", p1Token)
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
                new GameActionRequest("ANSWER", 0, null, "p1", p1Token)
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
        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token));

        assertThatThrownBy(() -> gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 0, null, "p2", p2Token)
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

        GameSessionSnapshot nextRound = gameSessionService.applyAction(
                createdSnapshot.gameId(),
                new GameActionRequest("PASS", null, null, "p1", p1Token)
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

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, null, "p1", p1Token));
        gameSessionService.applyAction(gameId, new GameActionRequest("PASS", null, null, "p2", p2Token));
        gameSessionService.applyAction(gameId, new GameActionRequest("PASS", null, null, "p1", p1Token));

        assertThat(counterValue("smartiq.game.session.started.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.session.completed.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.round.completed.total")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.action.total", "type", "answer")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.action.total", "type", "pass")).isEqualTo(2.0);
        assertThat(counterValue("smartiq.game.answer.total", "outcome", "correct")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.answer.total", "outcome", "wrong")).isEqualTo(0.0);
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
                new GameActionRequest("PASS", null, null, "p1", "at_invalid")
        ))
                .isInstanceOf(ForbiddenGameActionException.class)
                .hasMessage("invalid action token");
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
                new GameActionRequest("PASS", null, null, "p2", p2Token)
        ))
                .isInstanceOf(ForbiddenGameActionException.class)
                .hasMessage("actor is not active player");
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
}
