package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record AuthRequestLinkResponse(
        UUID tenantId,
        String email,
        String deliveryMode,
        String challengeToken,
        Instant expiresAt
) {
}
