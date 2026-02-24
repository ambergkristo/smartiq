package com.smartiq.backend.migration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfoService;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class FlywayMigrationConsistencyTest {

    private static final Pattern VERSIONED_MIGRATION = Pattern.compile("^V(\\d+)__.+\\.sql$", Pattern.CASE_INSENSITIVE);

    @Test
    void cleanMigrateEndsAtLatestVersionAndLeavesNoPendingMigrations() throws IOException {
        int expectedLatestVersion = highestVersionFromFilesystem();

        Flyway flyway = Flyway.configure()
                .dataSource("jdbc:h2:mem:smartiq_flyway_consistency;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "")
                .locations("classpath:db/migration")
                .placeholders(Map.of("seed_core_enabled", "false"))
                .cleanDisabled(false)
                .load();

        flyway.clean();
        flyway.migrate();

        MigrationInfoService info = flyway.info();
        assertNotNull(info.current(), "Current migration should exist after migrate");

        MigrationVersion currentVersion = info.current().getVersion();
        assertNotNull(currentVersion, "Current migration should have a version");
        assertEquals(
                String.valueOf(expectedLatestVersion),
                currentVersion.getVersion(),
                "Flyway should migrate to the latest versioned migration"
        );
        assertEquals(0, info.pending().length, "No pending migrations should remain after migrate");
    }

    private int highestVersionFromFilesystem() throws IOException {
        Path migrationDir = Path.of("src", "main", "resources", "db", "migration");
        try (Stream<Path> files = Files.list(migrationDir)) {
            return files
                    .map(Path::getFileName)
                    .map(Path::toString)
                    .map(this::extractVersion)
                    .flatMap(Optional::stream)
                    .max(Integer::compareTo)
                    .orElseThrow(() -> new IllegalStateException("No versioned Flyway migration files found"));
        }
    }

    private Optional<Integer> extractVersion(String filename) {
        Matcher matcher = VERSIONED_MIGRATION.matcher(filename);
        if (!matcher.matches()) {
            return Optional.empty();
        }
        return Optional.of(Integer.parseInt(matcher.group(1)));
    }
}
