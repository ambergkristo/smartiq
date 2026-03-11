package com.smartiq.backend.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.auth.AuthContextResolver;
import com.smartiq.backend.room.ws.RoomWsGateway;
import com.smartiq.backend.tenant.TenantBrandingResponse;
import com.smartiq.backend.tenant.TenantBrandingRuntimeResponse;
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

import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

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
        lenient().when(authContextResolver.resolveOptional(any())).thenReturn(null);
        mockMvc = MockMvcBuilders.standaloneSetup(new RoomController(roomService, roomWsGateway, authContextResolver, tenantService))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void createRoomReturnsParticipantPayload() throws Exception {
        when(roomService.createRoom(any(), isNull(), isNull())).thenReturn(new RoomParticipantResponse("ABC123", "p1", "rt_host"));

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateRoomRequest("Alice"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p1"))
                .andExpect(jsonPath("$.authToken").value("rt_host"));
    }

    @Test
    void getRoomsCollectionWithoutMappingReturnsMethodNotAllowed() throws Exception {
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.code").value("INVALID_ACTION"))
                .andExpect(jsonPath("$.error").value("Request method 'GET' is not supported"))
                .andExpect(jsonPath("$.status").value(405))
                .andExpect(jsonPath("$.path").value("/api/rooms"));
    }

    @Test
    void getRoomReturnsDecoratedPublicPreview() throws Exception {
        UUID tenantId = UUID.randomUUID();
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                null,
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
        when(roomService.getRoomSnapshot(eq("ABC123"), isNull())).thenReturn(snapshot);
        when(tenantService.getTenantBrandingForRuntimeTenant(eq(tenantId)))
                .thenReturn(new TenantBrandingRuntimeResponse(
                        tenantId,
                        new TenantBrandingResponse("Northwind Quiz", null, "#223344", "#556677"),
                        Instant.parse("2026-03-06T10:15:30Z")
                ));

        mockMvc.perform(get("/api/rooms/ABC123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.branding.appName").value("Northwind Quiz"))
                .andExpect(jsonPath("$.players[0].displayName").value("Alice"));
    }

    @Test
    void joinRoomReturnsParticipantPayload() throws Exception {
        when(roomService.joinRoom(eq("ABC123"), any(), isNull())).thenReturn(new RoomParticipantResponse("ABC123", "p2", "rt_join"));
        UUID tenantId = UUID.randomUUID();
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                null,
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
        when(tenantService.getTenantBrandingForRuntimeTenant(eq(tenantId)))
                .thenReturn(new TenantBrandingRuntimeResponse(
                        tenantId,
                        new TenantBrandingResponse("Northwind Quiz", null, "#223344", "#556677"),
                        Instant.parse("2026-03-06T10:15:30Z")
                ));
        RoomSnapshot decoratedSnapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                new RoomBrandingSnapshot("Northwind Quiz", null, "#223344", "#556677"),
                snapshot.players()
        );
        when(roomService.getRoomSnapshot(eq("ABC123"), isNull())).thenReturn(snapshot);

        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p2"))
                .andExpect(jsonPath("$.authToken").value("rt_join"))
                .andExpect(jsonPath("$.roomState.branding.appName").doesNotExist());

        verify(roomWsGateway).sendPlayerJoined("ABC123", "p2", decoratedSnapshot);
        verify(roomWsGateway).sendRoomState("ABC123", decoratedSnapshot);
    }

    @Test
    void joinMissingRoomMapsToNotFoundErrorShape() throws Exception {
        when(roomService.joinRoom(eq("ZZZZZZ"), any(), isNull()))
                .thenThrow(new NoSuchElementException("room not found: ZZZZZZ"));

        mockMvc.perform(post("/api/rooms/ZZZZZZ/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"))
                .andExpect(jsonPath("$.error").value("room not found: ZZZZZZ"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/rooms/ZZZZZZ/join"));
    }

    @Test
    void joinInvalidRoomCodeMapsToBadRequestErrorShape() throws Exception {
        when(roomService.joinRoom(eq("MISSING"), any(), isNull()))
                .thenThrow(new IllegalArgumentException("room code format is invalid"));

        mockMvc.perform(post("/api/rooms/MISSING/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROOM_REQUEST"))
                .andExpect(jsonPath("$.error").value("room code format is invalid"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/rooms/MISSING/join"));
    }

    @Test
    void rejoinRoomReturnsResumePayload() throws Exception {
        UUID tenantId = UUID.randomUUID();
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                null,
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
        when(tenantService.getTenantBrandingForRuntimeTenant(eq(tenantId)))
                .thenReturn(new TenantBrandingRuntimeResponse(
                        tenantId,
                        new TenantBrandingResponse("Northwind Quiz", null, "#223344", "#556677"),
                        Instant.parse("2026-03-06T10:15:30Z")
                ));
        when(roomService.rejoinRoom(eq("ABC123"), any(), isNull()))
                .thenReturn(new RoomResumeResponse("ABC123", "p1", "rt_host", snapshot));

        mockMvc.perform(post("/api/rooms/ABC123/rejoin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejoinRoomRequest("p1", "rt_host"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p1"))
                .andExpect(jsonPath("$.authToken").value("rt_host"))
                .andExpect(jsonPath("$.roomState.branding.appName").value("Northwind Quiz"))
                .andExpect(jsonPath("$.roomState.players[0].displayName").value("Alice"));
    }

    @Test
    void rejoinInvalidTokenMapsToInvalidRoomTokenCode() throws Exception {
        when(roomService.rejoinRoom(eq("ABC123"), any(), isNull()))
                .thenThrow(new IllegalArgumentException("invalid room token"));

        mockMvc.perform(post("/api/rooms/ABC123/rejoin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejoinRoomRequest("p1", "rt_bad"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROOM_TOKEN"))
                .andExpect(jsonPath("$.error").value("invalid room token"))
                .andExpect(jsonPath("$.path").value("/api/rooms/ABC123/rejoin"));
    }

    @Test
    void rejoinMissingPlayerMapsToPlayerNotFoundCode() throws Exception {
        when(roomService.rejoinRoom(eq("ABC123"), any(), isNull()))
                .thenThrow(new NoSuchElementException("player not found: p1"));

        mockMvc.perform(post("/api/rooms/ABC123/rejoin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejoinRoomRequest("p1", "rt_old"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("PLAYER_NOT_FOUND"))
                .andExpect(jsonPath("$.error").value("player not found: p1"))
                .andExpect(jsonPath("$.path").value("/api/rooms/ABC123/rejoin"));
    }

    @Test
    void removePlayerReturnsDecoratedSnapshotAndBroadcastsRoomState() throws Exception {
        UUID tenantId = UUID.randomUUID();
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                null,
                List.of(new RoomPlayerSnapshot("p1", "Alice"))
        );
        when(roomService.removePlayer(eq("ABC123"), any(), isNull())).thenReturn(snapshot);
        when(tenantService.getTenantBrandingForRuntimeTenant(eq(tenantId)))
                .thenReturn(new TenantBrandingRuntimeResponse(
                        tenantId,
                        new TenantBrandingResponse("Northwind Quiz", null, "#223344", "#556677"),
                        Instant.parse("2026-03-06T10:15:30Z")
                ));
        RoomSnapshot decoratedSnapshot = new RoomSnapshot(
                "ABC123",
                tenantId,
                new RoomBrandingSnapshot("Northwind Quiz", null, "#223344", "#556677"),
                snapshot.players()
        );

        mockMvc.perform(post("/api/rooms/ABC123/remove-player")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RemoveRoomPlayerRequest("p1", "rt_host", "p2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.branding.appName").value("Northwind Quiz"))
                .andExpect(jsonPath("$.players[0].displayName").value("Alice"));

        verify(roomWsGateway).sendRoomState("ABC123", decoratedSnapshot);
    }
}
