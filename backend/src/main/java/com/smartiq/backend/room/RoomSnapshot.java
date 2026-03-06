package com.smartiq.backend.room;

import java.util.UUID;
import java.util.List;

public record RoomSnapshot(
        String roomCode,
        UUID tenantId,
        RoomBrandingSnapshot branding,
        List<RoomPlayerSnapshot> players
) {
}
