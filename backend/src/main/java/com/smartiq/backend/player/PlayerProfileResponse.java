package com.smartiq.backend.player;

import java.time.Instant;
import java.util.Map;

public record PlayerProfileResponse(
        String guestToken,
        Map<String, Object> profile,
        Instant updatedAt
) {
}
