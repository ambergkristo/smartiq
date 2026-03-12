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
        gameSessionService = new GameSessionService(
                cardService,
                meterRegistry,
                new GameSessionProperties(180, 50000),
                Clock.fixed(Instant.parse("2026-02-25T00:00:00Z"), ZoneOffset.UTC)
        );
    }

    @Test
    void createGameInitializesCherryPickSnapshot() {
      when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
              .thenReturn(openCardWithCorrectIndexes("card-1", List.of(0), "Question 1"));

      GameSessionCreateResponse created = gameSessionService.createGameWithControl(
              new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30)
      );
      GameSessionSnapshot snapshot = created.snapshot();

      assertThat(snapshot.roundState().phase()).isEqualTo("QUESTION_ACTIVE");
      assertThat(snapshot.boardState().pegs()).hasSize(8);
      assertThat(snapshot.boardState().pegs()).allSatisfy(peg -> assertThat(peg.state()).isEqualTo("hidden"));
      assertThat(snapshot.boardState().correctAnswerIndexes()).containsExactly(0);
      assertThat(snapshot.statuses()).containsEntry("p1", PlayerRoundStatus.ACTIVE);
      assertThat(snapshot.statuses()).containsEntry("p2", PlayerRoundStatus.ACTIVE);
    }

    @Test
    void roundSucceedsWhenAllCorrectAnswersAreSelected() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCardWithCorrectIndexes("card-1", List.of(0, 1), "Question 1"),
                        openCardWithCorrectIndexes("card-2", List.of(2), "Question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String token = created.actionTokens().get("p1");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, "p1", token, "req-success-1"));
        GameSessionSnapshot success = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 1, "p1", token, "req-success-2")
        );

        assertThat(success.roundState().phase()).isEqualTo("ROUND_SUCCESS");
        assertThat(success.totalScores().get("p1")).isEqualTo(2);
        assertThat(success.boardState().pegs().get(0).state()).isEqualTo("revealed");
        assertThat(success.boardState().pegs().get(1).state()).isEqualTo("revealed");

        GameSessionSnapshot advanced = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ADVANCE", null, "p1", token, "req-success-3")
        );

        assertThat(advanced.roundState().roundNumber()).isEqualTo(2);
        assertThat(advanced.roundState().phase()).isEqualTo("QUESTION_ACTIVE");
        assertThat(advanced.boardState().question()).isEqualTo("Question 2");
    }

    @Test
    void roundFailsOnFirstIncorrectAnswer() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCardWithCorrectIndexes("card-1", List.of(0), "Question 1"),
                        openCardWithCorrectIndexes("card-2", List.of(2), "Question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String token = created.actionTokens().get("p1");

        GameSessionSnapshot failed = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 3, "p1", token, "req-fail-1")
        );

        assertThat(failed.roundState().phase()).isEqualTo("ROUND_FAIL");
        assertThat(failed.statuses().get("p1")).isEqualTo(PlayerRoundStatus.OUT);
        assertThat(failed.totalScores().get("p1")).isZero();
        assertThat(failed.boardState().pegs().get(3).state()).isEqualTo("wrong");

        GameSessionSnapshot advanced = gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ADVANCE", null, "p1", token, "req-fail-2")
        );

        assertThat(advanced.roundState().phase()).isEqualTo("QUESTION_ACTIVE");
        assertThat(advanced.roundState().roundNumber()).isEqualTo(2);
    }

    @Test
    void rejectsPassBecauseCherryPickRemovesIt() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCardWithCorrectIndexes("card-1", List.of(0), "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );

        assertThatThrownBy(() -> gameSessionService.applyAction(
                created.snapshot().gameId(),
                new GameActionRequest("PASS", null, "p1", created.actionTokens().get("p1"), "req-pass-1")
        ))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("unsupported action type: PASS");
    }

    @Test
    void rejectsDuplicateActionRequestIds() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(openCardWithCorrectIndexes("card-1", List.of(0), "Question 1"));

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String token = created.actionTokens().get("p1");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, "p1", token, "req-dup-1"));

        assertThatThrownBy(() -> gameSessionService.applyAction(
                gameId,
                new GameActionRequest("ANSWER", 0, "p1", token, "req-dup-1")
        ))
                .isInstanceOf(DuplicateGameActionException.class)
                .hasMessage("duplicate actionRequestId");
    }

    @Test
    void recordsCherryPickGameplayTelemetry() {
        when(cardService.getNextRandomCard(eq("en"), anyString(), eq(null)))
                .thenReturn(
                        openCardWithCorrectIndexes("card-1", List.of(0), "Question 1"),
                        openCardWithCorrectIndexes("card-2", List.of(1), "Question 2")
                );

        GameSessionCreateResponse created = gameSessionService.createGameWithControl(
                new CreateGameRequest(List.of("Alice"), "en", null, 30)
        );
        String gameId = created.snapshot().gameId();
        String token = created.actionTokens().get("p1");

        gameSessionService.applyAction(gameId, new GameActionRequest("ANSWER", 0, "p1", token, "req-metric-1"));
        gameSessionService.applyAction(gameId, new GameActionRequest("ADVANCE", null, "p1", token, "req-metric-2"));

        assertThat(counterValue("smartiq.game.action.total", "type", "answer")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.action.total", "type", "advance")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.answer.total", "outcome", "correct")).isEqualTo(1.0);
        assertThat(counterValue("smartiq.game.round.completed.total")).isEqualTo(1.0);
        verify(cardService, times(2)).getNextRandomCard(eq("en"), anyString(), eq(null));
    }

    private double counterValue(String name, String... tags) {
        var counter = meterRegistry.find(name).tags(tags).tag("language", "en").counter();
        if (counter == null) {
            return 0.0;
        }
        return counter.count();
    }

    private static CardDeckResponse openCardWithCorrectIndexes(String cardId, List<Integer> correctIndexes, String question) {
        return new CardDeckResponse(
                cardId,
                "OPEN",
                "Science",
                "en",
                question,
                List.of("A", "B", "C", "D", "E", "F", "G", "H"),
                Map.of("correctIndexes", correctIndexes),
                "2",
                "smartiq-v2",
                null
        );
    }
}
