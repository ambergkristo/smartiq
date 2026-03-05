package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Instant;
import java.util.UUID;

public record TenantSettingsResponse(
        UUID tenantId,
        JsonNode settings,
        Instant updatedAt
) {
}
