package com.smartiq.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
        ImportProperties.class,
        QuestionPoolProperties.class,
        SessionDedupProperties.class,
        CorsProperties.class
})
public class ImportConfiguration {
}
