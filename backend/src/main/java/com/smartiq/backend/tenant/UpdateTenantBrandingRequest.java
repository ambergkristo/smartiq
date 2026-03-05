package com.smartiq.backend.tenant;

public record UpdateTenantBrandingRequest(
        String appName,
        String logoUrl,
        String primaryColor,
        String secondaryColor
) {
}
