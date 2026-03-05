package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantSummaryResponse(
        UUID tenantId,
        String slug,
        String name,
        String status,
        Instant createdAt
) {
}
