package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;

public record UpdateTenantSettingsRequest(
        JsonNode settings
) {
}
