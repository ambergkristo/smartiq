package com.smartiq.backend.tenant;

import java.util.UUID;

public record RuntimeAuthContextResponse(
        String bearerToken,
        String userEmail,
        UUID tenantId
) {
}
