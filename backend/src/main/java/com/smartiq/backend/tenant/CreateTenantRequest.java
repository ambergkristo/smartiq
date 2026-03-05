package com.smartiq.backend.tenant;

public record CreateTenantRequest(
        String slug,
        String name,
        String legalEntityName,
        String billingEmail
) {
}
