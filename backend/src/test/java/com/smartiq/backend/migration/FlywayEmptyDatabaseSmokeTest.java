package com.smartiq.backend.migration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

import java.util.Map;

class FlywayEmptyDatabaseSmokeTest {

    @Test
    void migrationsApplyOnCleanH2Database() {
        Flyway flyway = Flyway.configure()
                .dataSource("jdbc:h2:mem:smartiq_flyway_empty;MODE=PostgreSQL;DB_CLOSE_DELAY=-1", "sa", "")
                .locations("classpath:db/migration")
                .placeholders(Map.of("seed_core_enabled", "false"))
                .cleanDisabled(false)
                .load();

        flyway.clean();
        flyway.migrate();
    }
}
