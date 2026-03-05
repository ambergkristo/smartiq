package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record TenantUsageEventResponse(
        UUID usageEventId,
        UUID tenantId,
        String eventType,
        long eventValue,
        Instant eventTime,
        JsonNode metadata,
        Instant createdAt
) {
}
