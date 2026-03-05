package com.smartiq.backend.auth;

import java.util.UUID;

public record ResolvedAuthContext(
        String userEmail,
        UUID tenantId
) {
}
