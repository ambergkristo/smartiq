package com.smartiq.backend.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.util.StringUtils;

import java.util.Locale;

public class PostgresDatasourcePreflightEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        String datasourceUrl = trimToEmpty(environment.getProperty("spring.datasource.url"));
        if (!datasourceUrl.toLowerCase(Locale.ROOT).startsWith("jdbc:postgresql:")) {
            return;
        }

        String datasourcePassword = trimToEmpty(environment.getProperty("spring.datasource.password"));
        if (StringUtils.hasText(datasourcePassword)) {
            return;
        }

        throw new IllegalStateException(
                "SPRING_DATASOURCE_PASSWORD is required when SPRING_DATASOURCE_URL points to PostgreSQL. "
                        + "Set SPRING_DATASOURCE_PASSWORD or use spring profile 'dev' for local smoke."
        );
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE + 10;
    }

    private String trimToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
