package com.smartiq.backend.game;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import com.smartiq.backend.web.ApiExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GameSessionControllerTest {

    @Mock
    private GameSessionService gameSessionService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new GameSessionController(gameSessionService))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void createGameReturnsSnapshot() throws Exception {
        when(gameSessionService.createGameWithControl(any())).thenReturn(
                new GameSessionCreateResponse(
                        snapshot("game-1", "CHOOSING"),
                        Map.of("p1", "at_1", "p2", "at_2")
                )
        );

        mockMvc.perform(post("/api/game")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.gameId").value("game-1"))
                .andExpect(jsonPath("$.snapshot.roundState.phase").value("CHOOSING"))
                .andExpect(jsonPath("$.actionTokens.p1").value("at_1"));
    }

    @Test
    void getGameReturnsSnapshot() throws Exception {
        when(gameSessionService.getSnapshot(eq("game-1"))).thenReturn(snapshot("game-1", "CHOOSING"));

        mockMvc.perform(get("/api/game/game-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameId").value("game-1"));
    }

    @Test
    void applyActionReturnsUpdatedSnapshot() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any())).thenReturn(snapshot("game-1", "GAME_OVER"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "at_1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundState.phase").value("GAME_OVER"));
    }

    @Test
    void invalidActionIsMappedToBadRequestErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any()))
                .thenThrow(new IllegalArgumentException("type is required"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest(null, null, null, "p1", "at_1"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("type is required"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/action"));
    }

    @Test
    void forbiddenActionIsMappedToForbiddenErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any()))
                .thenThrow(new ForbiddenGameActionException("invalid action token"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "bad_token"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("invalid action token"))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/action"));
    }

    private static GameSessionSnapshot snapshot(String gameId, String phase) {
        return new GameSessionSnapshot(
                gameId,
                30,
                0,
                List.of(
                        new PlayerSnapshot("p1", "Alice"),
                        new PlayerSnapshot("p2", "Bob")
                ),
                new RoundStateSnapshot(1, phase, "p1", "p1", "ok"),
                new BoardStateSnapshot(
                        "Question",
                        "OPEN",
                        "Science",
                        List.of(new PegSnapshot(0, "hidden", null))
                ),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", PlayerRoundStatus.ACTIVE, "p2", PlayerRoundStatus.ACTIVE)
        );
    }
}
