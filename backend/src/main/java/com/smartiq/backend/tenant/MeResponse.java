package com.smartiq.backend.tenant;

import java.util.List;
import java.util.UUID;

public record MeResponse(
        UUID userId,
        String email,
        String displayName,
        UUID selectedTenantId,
        String selectedRole,
        List<MeTenantAccessResponse> memberships
) {
}
