package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantUsageSummaryResponse(
        UUID tenantId,
        String eventType,
        long totalValue,
        long eventCount,
        Instant firstEventTime,
        Instant lastEventTime
) {
}
