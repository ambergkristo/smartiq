package com.smartiq.backend.tenant;

import java.util.UUID;

public record TenantPilotSummaryResponse(
        UUID tenantId,
        String planCode,
        String subscriptionStatus,
        long workspaceBootstraps,
        long hostSignIns,
        long sessionLaunches,
        long duplicateLaunches,
        long resumeActions,
        long completedSessions,
        long upgradeAttempts,
        long paidActivations,
        boolean activated,
        boolean repeatHost,
        boolean paidConverted,
        long openSupportCases,
        long resolvedSupportCases,
        String topOpenSupportCategory,
        String riskStatus,
        String recommendation
) {
}
