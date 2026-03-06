package com.smartiq.backend.tenant;

import java.util.UUID;

public record AuthRequestLinkRequest(
        String email,
        UUID tenantId
) {
}
