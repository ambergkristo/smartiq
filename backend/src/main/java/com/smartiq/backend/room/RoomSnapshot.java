package com.smartiq.backend.room;

import java.util.UUID;
import java.util.List;

public record RoomSnapshot(
        String roomCode,
        UUID tenantId,
        RoomBrandingSnapshot branding,
        List<RoomPlayerSnapshot> players,
        RoomPhase phase,
        boolean joinable,
        RoomActiveGameSnapshot activeGame
) {
    public RoomSnapshot(String roomCode,
                        UUID tenantId,
                        RoomBrandingSnapshot branding,
                        List<RoomPlayerSnapshot> players) {
        this(roomCode, tenantId, branding, players, RoomPhase.WAITING, true, null);
    }
}
