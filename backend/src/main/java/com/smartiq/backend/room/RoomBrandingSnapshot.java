package com.smartiq.backend.room;

public record RoomBrandingSnapshot(
        String appName,
        String logoUrl,
        String primaryColor,
        String secondaryColor
) {
}
