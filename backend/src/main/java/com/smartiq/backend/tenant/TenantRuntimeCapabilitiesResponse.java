package com.smartiq.backend.tenant;

import java.util.UUID;

public record TenantRuntimeCapabilitiesResponse(
        UUID tenantId,
        String planTier,
        int maxHostedPlayers,
        boolean analyticsHistoryEnabled,
        boolean sessionTemplatesEnabled,
        boolean customBrandingEnabled
) {
}
