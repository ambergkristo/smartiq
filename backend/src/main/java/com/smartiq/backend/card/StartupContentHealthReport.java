package com.smartiq.backend.card;

public record StartupContentHealthReport(
        boolean healthy,
        boolean importEnabled,
        boolean startupValidationEnforced,
        boolean datasetFound,
        int cardsImported,
        int topicsCreated,
        long allowedSourceCards,
        long publicTopics,
        String reason
) {
    public static StartupContentHealthReport notRun() {
        return new StartupContentHealthReport(
                true,
                false,
                false,
                true,
                0,
                0,
                0,
                0,
                ""
        );
    }
}
