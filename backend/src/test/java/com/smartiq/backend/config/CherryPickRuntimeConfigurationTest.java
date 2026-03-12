package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class CherryPickRuntimeConfigurationTest {

    @Test
    void defaultConfigUsesSingleEnglishCanonicalDatasetSource() throws IOException {
        Path applicationPath = Path.of("src", "main", "resources", "application.yml");
        if (!Files.exists(applicationPath)) {
            applicationPath = Path.of("backend", "src", "main", "resources", "application.yml");
        }
        String applicationYaml = Files.readString(applicationPath);

        assertThat(applicationYaml)
                .contains("path: ${SMARTIQ_IMPORT_PATH:../data/smart10/cards.en.json}")
                .contains("et-enabled: ${SMARTIQ_LANGUAGE_ET_ENABLED:false}")
                .doesNotContain("../data/smart10/cards.et.json")
                .doesNotContain("classpath:data/runtime/cards.en.json");
    }
}
