package com.smartiq.backend.tenant;

import java.util.List;

public record RuntimeSessionTemplateUpsertRequest(
        String name,
        String topic,
        String language,
        String theme,
        List<String> players
) {
}
