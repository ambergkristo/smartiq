package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;

public record CreateTenantUsageEventRequest(
        String eventType,
        Long eventValue,
        Instant eventTime,
        JsonNode metadata
) {
}
