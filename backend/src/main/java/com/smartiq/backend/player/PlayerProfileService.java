package com.smartiq.backend.player;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class PlayerProfileService {

    private static final TypeReference<Map<String, Object>> PROFILE_MAP_TYPE = new TypeReference<>() {
    };

    private final PlayerProfileRepository playerProfileRepository;
    private final ObjectMapper objectMapper;

    public PlayerProfileService(PlayerProfileRepository playerProfileRepository, ObjectMapper objectMapper) {
        this.playerProfileRepository = playerProfileRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public PlayerProfileResponse getProfile(String guestToken) {
        String normalizedGuestToken = normalizeGuestToken(guestToken);
        PlayerProfile profile = playerProfileRepository.findByGuestToken(normalizedGuestToken)
                .orElseThrow(() -> new NoSuchElementException("player profile not found"));
        return toResponse(profile);
    }

    @Transactional
    public PlayerProfileResponse upsertProfile(String guestToken, Map<String, Object> payload) {
        String normalizedGuestToken = normalizeGuestToken(guestToken);
        Map<String, Object> normalizedPayload = normalizeProfilePayload(payload, normalizedGuestToken);
        Instant now = Instant.now();
        PlayerProfile profile = playerProfileRepository.findByGuestToken(normalizedGuestToken)
                .orElseGet(() -> {
                    PlayerProfile created = new PlayerProfile();
                    created.setId(UUID.randomUUID());
                    created.setGuestToken(normalizedGuestToken);
                    created.setCreatedAt(now);
                    return created;
                });
        profile.setProfileJson(writeProfileJson(normalizedPayload));
        profile.setUpdatedAt(now);
        PlayerProfile saved = playerProfileRepository.save(profile);
        return toResponse(saved);
    }

    private static String normalizeGuestToken(String guestToken) {
        String normalized = String.valueOf(guestToken == null ? "" : guestToken).trim();
        if (!normalized.matches("guest_[A-Za-z0-9._-]{8,150}")) {
            throw new IllegalArgumentException("valid guest token is required");
        }
        return normalized;
    }

    private static Map<String, Object> normalizeProfilePayload(Map<String, Object> payload, String guestToken) {
        if (payload == null || payload.isEmpty()) {
            throw new IllegalArgumentException("profile payload is required");
        }
        Map<String, Object> normalized = new LinkedHashMap<>(payload);
        String payloadGuestToken = String.valueOf(normalized.getOrDefault("guestToken", "")).trim();
        if (!payloadGuestToken.isEmpty() && !guestToken.equals(payloadGuestToken)) {
            throw new IllegalArgumentException("profile guest token must match request path");
        }
        normalized.put("guestToken", guestToken);
        return normalized;
    }

    private String writeProfileJson(Map<String, Object> profile) {
        try {
            return objectMapper.writeValueAsString(profile);
        } catch (Exception exception) {
            throw new IllegalArgumentException("profile payload is not valid JSON");
        }
    }

    private PlayerProfileResponse toResponse(PlayerProfile profile) {
        try {
            Map<String, Object> payload = objectMapper.readValue(profile.getProfileJson(), PROFILE_MAP_TYPE);
            return new PlayerProfileResponse(profile.getGuestToken(), payload, profile.getUpdatedAt());
        } catch (Exception exception) {
            throw new IllegalStateException("stored player profile is invalid");
        }
    }
}
