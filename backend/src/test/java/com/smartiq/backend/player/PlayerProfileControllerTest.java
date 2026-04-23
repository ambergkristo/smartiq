package com.smartiq.backend.player;

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

import java.time.Instant;
import java.util.Map;
import java.util.NoSuchElementException;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PlayerProfileControllerTest {

    @Mock
    private PlayerProfileService playerProfileService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(new PlayerProfileController(playerProfileService))
                .setControllerAdvice(new ApiExceptionHandler(false))
                .build();
    }

    @Test
    void upsertsGuestProfileByToken() throws Exception {
        when(playerProfileService.upsertProfile(eq("guest_12345678"), any())).thenReturn(
                new PlayerProfileResponse(
                        "guest_12345678",
                        Map.of("guestToken", "guest_12345678", "totalXp", 900),
                        Instant.parse("2026-04-23T10:00:00Z")
                )
        );

        mockMvc.perform(put("/api/player-profiles/guest_12345678")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "profile", Map.of("guestToken", "guest_12345678", "totalXp", 900)
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.guestToken").value("guest_12345678"))
                .andExpect(jsonPath("$.profile.totalXp").value(900));
    }

    @Test
    void returnsStoredGuestProfile() throws Exception {
        when(playerProfileService.getProfile("guest_12345678")).thenReturn(
                new PlayerProfileResponse(
                        "guest_12345678",
                        Map.of("guestToken", "guest_12345678", "bestSessionXp", 1200),
                        Instant.parse("2026-04-23T10:00:00Z")
                )
        );

        mockMvc.perform(get("/api/player-profiles/guest_12345678"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.bestSessionXp").value(1200));
    }

    @Test
    void missingProfileReturnsNotFound() throws Exception {
        when(playerProfileService.getProfile("guest_missing12"))
                .thenThrow(new NoSuchElementException("player profile not found"));

        mockMvc.perform(get("/api/player-profiles/guest_missing12"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
}
