package com.smartiq.backend.tenant;

public record OnboardingBootstrapRequest(
        String workspaceName,
        String ownerEmail,
        String ownerDisplayName
) {
}
