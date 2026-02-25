package com.smartiq.backend.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.room.ws.RoomWsGateway;
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
import java.util.NoSuchElementException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

    @Mock
    private RoomService roomService;

    @Mock
    private RoomWsGateway roomWsGateway;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new RoomController(roomService, roomWsGateway))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void createRoomReturnsParticipantPayload() throws Exception {
        when(roomService.createRoom(any())).thenReturn(new RoomParticipantResponse("ABC123", "p1", "rt_host"));

        mockMvc.perform(post("/api/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateRoomRequest("Alice"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p1"))
                .andExpect(jsonPath("$.authToken").value("rt_host"));
    }

    @Test
    void joinRoomReturnsParticipantPayload() throws Exception {
        when(roomService.joinRoom(eq("ABC123"), any())).thenReturn(new RoomParticipantResponse("ABC123", "p2", "rt_join"));
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
        when(roomService.getRoomSnapshot(eq("ABC123"))).thenReturn(snapshot);

        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p2"))
                .andExpect(jsonPath("$.authToken").value("rt_join"));

        verify(roomWsGateway).sendPlayerJoined("ABC123", "p2", snapshot);
        verify(roomWsGateway).sendRoomState("ABC123", snapshot);
    }

    @Test
    void joinMissingRoomMapsToNotFoundErrorShape() throws Exception {
        when(roomService.joinRoom(eq("ZZZZZZ"), any()))
                .thenThrow(new NoSuchElementException("room not found: ZZZZZZ"));

        mockMvc.perform(post("/api/rooms/ZZZZZZ/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("room not found: ZZZZZZ"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/rooms/ZZZZZZ/join"));
    }

    @Test
    void joinInvalidRoomCodeMapsToBadRequestErrorShape() throws Exception {
        when(roomService.joinRoom(eq("MISSING"), any()))
                .thenThrow(new IllegalArgumentException("room code format is invalid"));

        mockMvc.perform(post("/api/rooms/MISSING/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("room code format is invalid"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value("/api/rooms/MISSING/join"));
    }

    @Test
    void rejoinRoomReturnsResumePayload() throws Exception {
        RoomSnapshot snapshot = new RoomSnapshot(
                "ABC123",
                List.of(
                        new RoomPlayerSnapshot("p1", "Alice"),
                        new RoomPlayerSnapshot("p2", "Bob")
                )
        );
        when(roomService.rejoinRoom(eq("ABC123"), any()))
                .thenReturn(new RoomResumeResponse("ABC123", "p1", "rt_host", snapshot));

        mockMvc.perform(post("/api/rooms/ABC123/rejoin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RejoinRoomRequest("p1", "rt_host"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p1"))
                .andExpect(jsonPath("$.authToken").value("rt_host"))
                .andExpect(jsonPath("$.roomState.players[0].displayName").value("Alice"));
    }
}
