package com.smartiq.backend.player;

import java.util.Map;

public record PlayerProfileUpsertRequest(
        Map<String, Object> profile
) {
}
