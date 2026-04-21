package com.smartiq.backend.game;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.ws.RoomWsGateway;
import com.smartiq.backend.tenant.TenantService;
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
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class GameSessionControllerTest {

    @Mock
    private GameSessionService gameSessionService;

    @Mock
    private RoomService roomService;

    @Mock
    private RoomWsGateway roomWsGateway;

    @Mock
    private AuthContextResolver authContextResolver;

    @Mock
    private TenantService tenantService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        when(authContextResolver.resolveOptional(any())).thenReturn(null);
        mockMvc = MockMvcBuilders.standaloneSetup(new GameSessionController(
                gameSessionService,
                roomService,
                roomWsGateway,
                authContextResolver,
                tenantService
        ))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void createGameReturnsCherryPickSnapshot() throws Exception {
        when(gameSessionService.createGameWithControl(any(), isNull(), isNull())).thenReturn(
                new GameSessionCreateResponse(
                        snapshot("game-1", "QUESTION_ACTIVE"),
                        Map.of("p1", "at_1", "p2", "at_2")
                )
        );

        mockMvc.perform(post("/api/game")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.gameId").value("game-1"))
                .andExpect(jsonPath("$.snapshot.roundState.phase").value("QUESTION_ACTIVE"))
                .andExpect(jsonPath("$.actionTokens.p1").value("at_1"));
    }

    @Test
    void getGameReturnsSnapshot() throws Exception {
        when(gameSessionService.getSnapshot(eq("game-1"), isNull())).thenReturn(snapshot("game-1", "QUESTION_ACTIVE"));

        mockMvc.perform(get("/api/game/game-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiVersion").value("1"))
                .andExpect(jsonPath("$.gameId").value("game-1"));
    }

    @Test
    void applyAnswerReturnsUpdatedSnapshot() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull())).thenReturn(snapshot("game-1", "ROUND_FAIL"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("ANSWER", 3, "p1", "at_1", "req-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundState.phase").value("ROUND_FAIL"));
    }

    @Test
    void applyAdvanceReturnsUpdatedSnapshot() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull())).thenReturn(snapshot("game-1", "QUESTION_ACTIVE"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("ADVANCE", null, "p1", "at_1", "req-2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundState.phase").value("QUESTION_ACTIVE"));
    }

    @Test
    void invalidActionIsMappedToBadRequestErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull()))
                .thenThrow(new IllegalArgumentException("unsupported action type: PASS"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, "p1", "at_1", "req-3"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ACTION"))
                .andExpect(jsonPath("$.error").value("unsupported action type: PASS"));
    }

    private static GameSessionSnapshot snapshot(String gameId, String phase) {
        return new GameSessionSnapshot(
                GameSessionSnapshot.CURRENT_API_VERSION,
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
                        List.of(
                                new PegSnapshot(0, "hidden", "A"),
                                new PegSnapshot(1, "hidden", "B")
                        ),
                        List.of(0)
                ),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", 0, "p2", 0),
                Map.of("p1", PlayerRoundStatus.ACTIVE, "p2", PlayerRoundStatus.ACTIVE)
        );
    }
}
