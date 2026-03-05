package com.smartiq.backend.tenant;

import java.util.UUID;

public record MeTenantAccessResponse(
        UUID tenantId,
        String tenantSlug,
        String tenantName,
        String role,
        String membershipStatus
) {
}
