package com.smartiq.backend.tenant;

import java.time.Instant;

public record TenantUsageSummaryRow(
        String eventType,
        long totalValue,
        long eventCount,
        Instant firstEventTime,
        Instant lastEventTime
) {
}
