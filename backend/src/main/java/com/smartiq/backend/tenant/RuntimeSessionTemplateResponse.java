package com.smartiq.backend.tenant;

import java.util.List;

public record RuntimeSessionTemplateResponse(
        String templateId,
        String name,
        String topic,
        String language,
        String theme,
        List<String> players,
        String updatedAt
) {
}
