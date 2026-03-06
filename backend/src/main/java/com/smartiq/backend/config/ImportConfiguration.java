package com.smartiq.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
        ImportProperties.class,
        QuestionPoolProperties.class,
        SessionDedupProperties.class,
        GameSessionProperties.class,
        RoomProperties.class,
        CorsProperties.class,
        BankEnforcerProperties.class,
        InternalAccessProperties.class,
        RateLimitProperties.class,
        AuthContextProperties.class,
        BillingProperties.class
})
public class ImportConfiguration {
}
