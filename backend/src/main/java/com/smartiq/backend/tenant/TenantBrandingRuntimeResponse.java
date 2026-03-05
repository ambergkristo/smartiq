package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantBrandingRuntimeResponse(
        UUID tenantId,
        TenantBrandingResponse branding,
        Instant updatedAt
) {
}
