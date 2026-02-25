package com.smartiq.backend.web;

import com.smartiq.backend.config.CorsProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CorsConfigUnitTest {

    @Mock
    private Environment environment;

    @Test
    void rejectsMissingExplicitOriginsInProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("APP_CORS_ALLOWED_ORIGINS", "")).thenReturn("");

        CorsConfig config = new CorsConfig(new CorsProperties(List.of()), environment);

        assertThatThrownBy(config::corsConfigurationSource)
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("At least one explicit CORS origin is required in prod.");
    }

    @Test
    void appliesAppCorsAllowedOriginsOverrideInProd() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(environment.getProperty("APP_CORS_ALLOWED_ORIGINS", ""))
                .thenReturn("https://env.smartiq.example,https://env2.smartiq.example");

        CorsConfig config = new CorsConfig(new CorsProperties(List.of("https://config.smartiq.example")), environment);

        var source = config.corsConfigurationSource();
        var cors = source.getCorsConfiguration(new MockHttpServletRequest("GET", "/api/topics"));

        assertThat(cors).isNotNull();
        assertThat(cors.getAllowedOrigins()).containsExactly("https://env.smartiq.example", "https://env2.smartiq.example");
        assertThat(cors.getAllowedOriginPatterns()).isNull();
    }
}
