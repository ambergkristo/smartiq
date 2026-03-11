package com.smartiq.backend.game;

import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.auth.ResolvedAuthContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.game.contract.BoardStateSnapshot;
import com.smartiq.backend.game.contract.GameSessionSnapshot;
import com.smartiq.backend.game.contract.PegSnapshot;
import com.smartiq.backend.game.contract.PlayerRoundStatus;
import com.smartiq.backend.game.contract.PlayerSnapshot;
import com.smartiq.backend.game.contract.RoundStateSnapshot;
import com.smartiq.backend.room.RoomService;
import com.smartiq.backend.room.RoomSnapshot;
import com.smartiq.backend.room.ws.RoomWsGateway;
import com.smartiq.backend.tenant.ForbiddenTenantAccessException;
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
import java.util.NoSuchElementException;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verify;
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
    private AuthContextResolver authContextResolver;

    @Mock
    private TenantService tenantService;

    @Mock
    private RoomService roomService;

    @Mock
    private RoomWsGateway roomWsGateway;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        when(authContextResolver.resolveOptional(any())).thenReturn(null);
        mockMvc = MockMvcBuilders.standaloneSetup(new GameSessionController(
                gameSessionService,
                authContextResolver,
                tenantService,
                roomService,
                roomWsGateway
        ))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void createGameReturnsSnapshot() throws Exception {
        when(gameSessionService.createGameWithControl(any(), isNull(), isNull())).thenReturn(
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
    void createGameWithRoomCodeValidatesAndPublishesRoomSnapshot() throws Exception {
        when(roomService.getRoomSnapshot(eq("ABC234"), isNull())).thenReturn(new RoomSnapshot("ABC234", null, null, List.of()));
        when(gameSessionService.createGameWithControl(any(), isNull(), isNull())).thenReturn(
                new GameSessionCreateResponse(
                        snapshot("game-1", "ABC234", "CHOOSING"),
                        Map.of("p1", "at_1", "p2", "at_2")
                )
        );
        when(roomService.upsertActiveGame(eq("ABC234"), any(), isNull()))
                .thenReturn(new RoomSnapshot("ABC234", null, null, List.of()));

        mockMvc.perform(post("/api/game")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateGameRequest(List.of("Alice", "Bob"), "en", null, 30, "ABC234"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.roomCode").value("ABC234"));

        verify(roomService).getRoomSnapshot("ABC234", null);
        verify(roomService).upsertActiveGame(eq("ABC234"), any(), isNull());
        verify(roomWsGateway).sendRoomState(eq("ABC234"), any(RoomSnapshot.class));
    }

    @Test
    void getGameReturnsSnapshot() throws Exception {
        when(gameSessionService.getSnapshot(eq("game-1"), isNull())).thenReturn(snapshot("game-1", "CHOOSING"));

        mockMvc.perform(get("/api/game/game-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.apiVersion").value("1"))
                .andExpect(jsonPath("$.gameId").value("game-1"));
    }

    @Test
    void duplicateGameReturnsNewControlledSnapshot() throws Exception {
        when(gameSessionService.buildDuplicateRequest(eq("game-1"), isNull()))
                .thenReturn(new CreateGameRequest(List.of("Alice", "Bob"), "en", "Science", 30));
        when(gameSessionService.duplicateGameWithControl(eq("game-1"), isNull(), isNull()))
                .thenReturn(new GameSessionCreateResponse(
                        snapshot("game-2", "CHOOSING"),
                        Map.of("p1", "at_3", "p2", "at_4")
                ));

        mockMvc.perform(post("/api/game/game-1/duplicate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.gameId").value("game-2"))
                .andExpect(jsonPath("$.actionTokens.p1").value("at_3"));
    }

    @Test
    void duplicateGameRecordsRepeatHostTelemetryForTenantMember() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(authContextResolver.resolveOptional(any()))
                .thenReturn(new ResolvedAuthContext("owner@acme.test", tenantId));
        when(gameSessionService.buildDuplicateRequest(eq("game-1"), eq(tenantId)))
                .thenReturn(new CreateGameRequest(List.of("Alice", "Bob"), "en", "Science", 30));
        when(gameSessionService.duplicateGameWithControl(eq("game-1"), eq(tenantId), eq("owner@acme.test")))
                .thenReturn(new GameSessionCreateResponse(
                        snapshot("game-2", "CHOOSING"),
                        Map.of("p1", "at_3", "p2", "at_4")
                ));

        mockMvc.perform(post("/api/game/game-1/duplicate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.gameId").value("game-2"));

        verify(tenantService).recordHostGameSessionDuplicated(
                eq("owner@acme.test"),
                eq(tenantId),
                eq("game-1"),
                eq("game-2")
        );
    }

    @Test
    void duplicateGameMapsCrossTenantAccessToForbiddenErrorShape() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(authContextResolver.resolveOptional(any()))
                .thenReturn(new ResolvedAuthContext("owner@acme.test", tenantId));
        when(gameSessionService.buildDuplicateRequest(eq("game-1"), eq(tenantId)))
                .thenReturn(new CreateGameRequest(List.of("Alice", "Bob"), "en", "Science", 30));
        when(gameSessionService.duplicateGameWithControl(eq("game-1"), eq(tenantId), eq("owner@acme.test")))
                .thenThrow(new ForbiddenTenantAccessException("tenant does not have access to game session"));

        mockMvc.perform(post("/api/game/game-1/duplicate"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_TENANT_ACCESS"))
                .andExpect(jsonPath("$.error").value("tenant does not have access to game session"))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/duplicate"));
    }

    @Test
    void resumeGameReturnsControlledSnapshotForTenantMember() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(authContextResolver.resolveOptional(any()))
                .thenReturn(new ResolvedAuthContext("owner@acme.test", tenantId));
        when(gameSessionService.getGameWithControl(eq("game-1"), eq(tenantId)))
                .thenReturn(new GameSessionCreateResponse(
                        snapshot("game-1", "CHOOSING"),
                        Map.of("p1", "at_1", "p2", "at_2")
                ));

        mockMvc.perform(post("/api/game/game-1/resume"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.gameId").value("game-1"))
                .andExpect(jsonPath("$.actionTokens.p1").value("at_1"));

        verify(tenantService).assertHostedRuntimeAllowedForMember("owner@acme.test", tenantId);
        verify(tenantService).recordHostGameSessionResumed("owner@acme.test", tenantId, "game-1");
    }

    @Test
    void resumeGameRequiresTenantContext() throws Exception {
        when(authContextResolver.resolveOptional(any())).thenReturn(null);

        mockMvc.perform(post("/api/game/game-1/resume"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ACTION"))
                .andExpect(jsonPath("$.error").value("tenant context is required"))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/resume"));
    }

    @Test
    void applyActionReturnsUpdatedSnapshot() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull())).thenReturn(snapshot("game-1", "GAME_OVER"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "at_1", "req-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundState.phase").value("GAME_OVER"));
    }

    @Test
    void applyActionPublishesUpdatedRoomSnapshotWhenGameIsRoomBound() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull()))
                .thenReturn(snapshot("game-1", "ROOM42", "CHOOSING"));
        when(roomService.upsertActiveGame(eq("ROOM42"), any(), isNull()))
                .thenReturn(new RoomSnapshot("ROOM42", null, null, List.of()));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "at_1", "req-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ROOM42"));

        verify(roomService).upsertActiveGame(eq("ROOM42"), any(), isNull());
        verify(roomWsGateway).sendRoomState(eq("ROOM42"), any(RoomSnapshot.class));
    }

    @Test
    void applyActionRecordsCompletionAuditWhenTenantGameEnds() throws Exception {
        UUID tenantId = UUID.randomUUID();
        when(authContextResolver.resolveOptional(any()))
                .thenReturn(new ResolvedAuthContext("owner@acme.test", tenantId));
        when(gameSessionService.applyAction(eq("game-1"), any(), eq(tenantId)))
                .thenReturn(snapshot("game-1", "GAME_OVER"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "at_1", "req-finish-1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roundState.phase").value("GAME_OVER"));

        verify(tenantService).recordHostGameSessionCompleted(
                eq("owner@acme.test"),
                eq(tenantId),
                eq("game-1"),
                eq("Alice"),
                eq(0),
                eq(1),
                eq("Science")
        );
    }

    @Test
    void gameNotFoundIsMappedToMachineReadableCode() throws Exception {
        when(gameSessionService.getSnapshot(eq("missing-game"), isNull()))
                .thenThrow(new NoSuchElementException("game not found: missing-game"));

        mockMvc.perform(get("/api/game/missing-game"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("GAME_NOT_FOUND"))
                .andExpect(jsonPath("$.error").value("game not found: missing-game"));
    }

    @Test
    void invalidActionIsMappedToBadRequestErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull()))
                .thenThrow(new IllegalArgumentException("type is required"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest(null, null, null, "p1", "at_1", "req-2"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ACTION"))
                .andExpect(jsonPath("$.error").value("type is required"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/action"));
    }

    @Test
    void forbiddenActionIsMappedToForbiddenErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull()))
                .thenThrow(new ForbiddenGameActionException("invalid action token"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "bad_token", "req-3"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("FORBIDDEN_ACTOR"))
                .andExpect(jsonPath("$.error").value("invalid action token"))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/action"));
    }

    @Test
    void duplicateActionIsMappedToConflictErrorShape() throws Exception {
        when(gameSessionService.applyAction(eq("game-1"), any(), isNull()))
                .thenThrow(new DuplicateGameActionException("duplicate actionRequestId"));

        mockMvc.perform(post("/api/game/game-1/action")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new GameActionRequest("PASS", null, null, "p1", "at_1", "req-4"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DUPLICATE_ACTION"))
                .andExpect(jsonPath("$.error").value("duplicate actionRequestId"))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.path").value("/api/game/game-1/action"));
    }

    private static GameSessionSnapshot snapshot(String gameId, String phase) {
        return snapshot(gameId, null, phase);
    }

    private static GameSessionSnapshot snapshot(String gameId, String roomCode, String phase) {
        return new GameSessionSnapshot(
                GameSessionSnapshot.CURRENT_API_VERSION,
                gameId,
                roomCode,
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
