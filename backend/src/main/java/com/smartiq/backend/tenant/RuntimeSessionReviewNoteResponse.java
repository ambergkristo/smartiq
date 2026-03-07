package com.smartiq.backend.tenant;

public record RuntimeSessionReviewNoteResponse(
        String gameId,
        String note,
        String updatedAt
) {
}
