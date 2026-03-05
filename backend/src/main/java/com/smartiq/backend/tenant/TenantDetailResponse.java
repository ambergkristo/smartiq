package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.UUID;

public record TenantDetailResponse(
        UUID tenantId,
        String slug,
        String name,
        String legalEntityName,
        String billingEmail,
        String status,
        Instant createdAt,
        Instant updatedAt,
        TenantBrandingResponse branding
) {
}
