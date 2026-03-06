package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantRuntimeSessionTemplatesResponse(
        UUID tenantId,
        List<RuntimeSessionTemplateResponse> templates,
        Instant updatedAt
) {
}
