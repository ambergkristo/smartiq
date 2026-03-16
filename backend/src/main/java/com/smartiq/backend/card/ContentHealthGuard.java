package com.smartiq.backend.card;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class ContentHealthGuard {

    public static final String FRONTEND_MESSAGE =
            "CherryPick content failed to load. Please check runtime dataset configuration.";

    private final CardRepository cardRepository;
    private final NextRandomCardService nextRandomCardService;
    private final AtomicReference<StartupContentHealthReport> startupReport =
            new AtomicReference<>(StartupContentHealthReport.notRun());

    public ContentHealthGuard(CardRepository cardRepository,
                              NextRandomCardService nextRandomCardService) {
        this.cardRepository = cardRepository;
        this.nextRandomCardService = nextRandomCardService;
    }

    public void recordStartupReport(StartupContentHealthReport report) {
        startupReport.set(report);
    }

    public StartupContentHealthReport getStartupReport() {
        return startupReport.get();
    }

    public ContentHealthStatus currentStatus() {
        StartupContentHealthReport report = startupReport.get();
        if (report.startupValidationEnforced() && !report.healthy()) {
            return ContentHealthStatus.failed(report.reason());
        }

        long allowedSourceCards = cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES);
        long publicTopics = cardRepository.findTopicCountsByLanguagesAndSources(
                resolvePublicLanguages(),
                CardSourcePolicy.ALLOWED_SOURCES
        ).size();

        if (allowedSourceCards <= 0 || publicTopics <= 0) {
            return ContentHealthStatus.failed(FRONTEND_MESSAGE);
        }

        return ContentHealthStatus.ok();
    }

    private List<String> resolvePublicLanguages() {
        List<String> languages = new ArrayList<>();
        languages.add("en");
        if (nextRandomCardService.isLanguageEnabled("et")) {
            languages.add("et");
        }
        return languages;
    }
}
