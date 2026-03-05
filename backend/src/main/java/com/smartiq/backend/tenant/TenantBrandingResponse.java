package com.smartiq.backend.tenant;

public record TenantBrandingResponse(
        String appName,
        String logoUrl,
        String primaryColor,
        String secondaryColor
) {
}
