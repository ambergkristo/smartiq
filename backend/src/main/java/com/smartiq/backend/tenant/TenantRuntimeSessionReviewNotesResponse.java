package com.smartiq.backend.tenant;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TenantRuntimeSessionReviewNotesResponse(
        UUID tenantId,
        List<RuntimeSessionReviewNoteResponse> notes,
        Instant updatedAt
) {
}
