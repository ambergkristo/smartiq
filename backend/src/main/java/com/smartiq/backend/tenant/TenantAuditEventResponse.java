package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record TenantAuditEventResponse(
        UUID auditEventId,
        UUID tenantId,
        UUID actorUserId,
        String action,
        String entityType,
        String entityId,
        JsonNode metadata,
        Instant eventTime,
        Instant createdAt
) {
}
