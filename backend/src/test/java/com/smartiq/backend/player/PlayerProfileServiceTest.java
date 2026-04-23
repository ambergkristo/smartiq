package com.smartiq.backend.player;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PlayerProfileServiceTest {

    @Mock
    private PlayerProfileRepository playerProfileRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void createsGuestProfileFromProgressionPayload() {
        when(playerProfileRepository.findByGuestToken("guest_12345678")).thenReturn(Optional.empty());
        when(playerProfileRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PlayerProfileService service = new PlayerProfileService(playerProfileRepository, objectMapper);

        PlayerProfileResponse response = service.upsertProfile(" guest_12345678 ", Map.of(
                "guestToken", "guest_12345678",
                "totalXp", 1200,
                "bestSessionXp", 900
        ));

        assertThat(response.guestToken()).isEqualTo("guest_12345678");
        assertThat(response.profile()).containsEntry("guestToken", "guest_12345678");
        assertThat(response.profile()).containsEntry("totalXp", 1200);
        assertThat(response.profile()).containsEntry("bestSessionXp", 900);
        assertThat(response.updatedAt()).isNotNull();

        ArgumentCaptor<PlayerProfile> profileCaptor = ArgumentCaptor.forClass(PlayerProfile.class);
        verify(playerProfileRepository).save(profileCaptor.capture());
        PlayerProfile saved = profileCaptor.getValue();
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getGuestToken()).isEqualTo("guest_12345678");
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getProfileJson()).contains("\"guestToken\":\"guest_12345678\"");
    }

    @Test
    void rejectsPayloadForDifferentGuestToken() {
        PlayerProfileService service = new PlayerProfileService(playerProfileRepository, objectMapper);

        assertThatThrownBy(() -> service.upsertProfile("guest_12345678", Map.of(
                "guestToken", "guest_different",
                "totalXp", 1200
        ))).isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("profile guest token must match request path");
    }

    @Test
    void returnsStoredGuestProfile() {
        PlayerProfile stored = new PlayerProfile();
        stored.setId(UUID.randomUUID());
        stored.setGuestToken("guest_12345678");
        stored.setProfileJson("{\"guestToken\":\"guest_12345678\",\"roundsWon\":4}");
        stored.setCreatedAt(Instant.parse("2026-04-23T10:00:00Z"));
        stored.setUpdatedAt(Instant.parse("2026-04-23T10:05:00Z"));
        when(playerProfileRepository.findByGuestToken("guest_12345678")).thenReturn(Optional.of(stored));
        PlayerProfileService service = new PlayerProfileService(playerProfileRepository, objectMapper);

        PlayerProfileResponse response = service.getProfile("guest_12345678");

        assertThat(response.guestToken()).isEqualTo("guest_12345678");
        assertThat(response.profile()).containsEntry("roundsWon", 4);
        assertThat(response.updatedAt()).isEqualTo(Instant.parse("2026-04-23T10:05:00Z"));
    }

    @Test
    void rejectsMissingProfiles() {
        when(playerProfileRepository.findByGuestToken("guest_missing12")).thenReturn(Optional.empty());
        PlayerProfileService service = new PlayerProfileService(playerProfileRepository, objectMapper);

        assertThatThrownBy(() -> service.getProfile("guest_missing12"))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("player profile not found");
    }
}
