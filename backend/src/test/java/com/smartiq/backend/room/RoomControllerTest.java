package com.smartiq.backend.room;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.web.ApiExceptionHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.NoSuchElementException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class RoomControllerTest {

    @Mock
    private RoomService roomService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new RoomController(roomService))
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

        mockMvc.perform(post("/api/rooms/ABC123/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roomCode").value("ABC123"))
                .andExpect(jsonPath("$.playerId").value("p2"))
                .andExpect(jsonPath("$.authToken").value("rt_join"));
    }

    @Test
    void joinMissingRoomMapsToNotFoundErrorShape() throws Exception {
        when(roomService.joinRoom(eq("MISSING"), any()))
                .thenThrow(new NoSuchElementException("room not found: MISSING"));

        mockMvc.perform(post("/api/rooms/MISSING/join")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new JoinRoomRequest("Bob"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("room not found: MISSING"))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.path").value("/api/rooms/MISSING/join"));
    }
}
