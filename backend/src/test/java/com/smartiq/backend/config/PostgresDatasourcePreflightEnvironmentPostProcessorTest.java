package com.smartiq.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PostgresDatasourcePreflightEnvironmentPostProcessorTest {

    private final PostgresDatasourcePreflightEnvironmentPostProcessor processor =
            new PostgresDatasourcePreflightEnvironmentPostProcessor();

    @Test
    void allowsNonPostgresDatasource() {
        ConfigurableEnvironment environment = environmentWith(
                "spring.datasource.url", "jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "spring.datasource.password", ""
        );

        assertDoesNotThrow(() -> processor.postProcessEnvironment(environment, new SpringApplication(Object.class)));
    }

    @Test
    void allowsPostgresDatasourceWhenPasswordProvided() {
        ConfigurableEnvironment environment = environmentWith(
                "spring.datasource.url", "jdbc:postgresql://localhost:5432/smartiq",
                "spring.datasource.password", "secret"
        );

        assertDoesNotThrow(() -> processor.postProcessEnvironment(environment, new SpringApplication(Object.class)));
    }

    @Test
    void rejectsPostgresDatasourceWhenPasswordMissing() {
        ConfigurableEnvironment environment = environmentWith(
                "spring.datasource.url", "jdbc:postgresql://localhost:5432/smartiq"
        );

        IllegalStateException exception = assertThrows(
                IllegalStateException.class,
                () -> processor.postProcessEnvironment(environment, new SpringApplication(Object.class))
        );

        assertTrue(exception.getMessage().contains("SPRING_DATASOURCE_PASSWORD"));
    }

    @Test
    void rejectsPostgresDatasourceWhenPasswordBlank() {
        ConfigurableEnvironment environment = environmentWith(
                "spring.datasource.url", "jdbc:postgresql://localhost:5432/smartiq",
                "spring.datasource.password", "   "
        );

        assertThrows(
                IllegalStateException.class,
                () -> processor.postProcessEnvironment(environment, new SpringApplication(Object.class))
        );
    }

    private ConfigurableEnvironment environmentWith(String... entries) {
        Map<String, Object> values = new HashMap<>();
        for (int i = 0; i < entries.length; i += 2) {
            values.put(entries[i], entries[i + 1]);
        }

        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("test", values));
        return environment;
    }
}
