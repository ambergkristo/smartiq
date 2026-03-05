package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantMemberResponse(
        UUID membershipId,
        UUID tenantId,
        UUID userId,
        String email,
        String displayName,
        String role,
        String status,
        Instant createdAt
) {
}
