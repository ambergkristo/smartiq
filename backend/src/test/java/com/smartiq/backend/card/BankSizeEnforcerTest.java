package com.smartiq.backend.card;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.smartiq.backend.config.BankEnforcerProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.core.env.Environment;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankSizeEnforcerTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private Environment environment;

    @Test
    void strictModeFailsWhenBankBelowMinimum() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(cardRepository.findAllPoolKeys(CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(List.of(new SimplePoolKey("Science", "3", "en")));
        when(cardRepository.countByPoolKey("Science", "3", "en", CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(6L);

        BankSizeEnforcer enforcer = new BankSizeEnforcer(
                cardRepository,
                new BankEnforcerProperties(1000, true, false, "npm run pipeline:cards"),
                environment
        );

        assertThatThrownBy(() -> enforcer.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Bank size below minimum for keys");
    }

    @Test
    void nonStrictModeLogsWarningsButAllowsStartup() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});
        when(cardRepository.findAllPoolKeys(CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(List.of(new SimplePoolKey("Sports", "1", "en")));
        when(cardRepository.countByPoolKey("Sports", "1", "en", CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(17L);

        BankSizeEnforcer enforcer = new BankSizeEnforcer(
                cardRepository,
                new BankEnforcerProperties(1000, false, false, "npm run pipeline:cards"),
                environment
        );

        Logger logger = (Logger) LoggerFactory.getLogger(BankSizeEnforcer.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            enforcer.run(new DefaultApplicationArguments());
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(appender.list)
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.INFO);
                    assertThat(event.getFormattedMessage()).contains("bank_validation_start");
                    assertThat(event.getFormattedMessage()).contains("activeProfiles=prod");
                    assertThat(event.getFormattedMessage()).contains("countedSources=[smartiq-v2, smartiq-human, smartiq-verified, flyway-seed-core]");
                })
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.WARN);
                    assertThat(event.getFormattedMessage()).contains("bank_validation_summary");
                    assertThat(event.getFormattedMessage()).contains("blockOnLowBank=false");
                })
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.WARN);
                    assertThat(event.getFormattedMessage()).contains("bank_low_startup_not_blocked");
                });
    }

    @Test
    void usesDefaultProfileLabelWhenNoActiveProfilesExist() {
        when(environment.getActiveProfiles()).thenReturn(new String[0]);
        when(cardRepository.findAllPoolKeys(CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(List.of(new SimplePoolKey("History", "2", "en")));
        when(cardRepository.countByPoolKey("History", "2", "en", CardSourcePolicy.ALLOWED_SOURCES))
                .thenReturn(12L);

        BankSizeEnforcer enforcer = new BankSizeEnforcer(
                cardRepository,
                new BankEnforcerProperties(1000, false, false, "npm run pipeline:cards"),
                environment
        );

        Logger logger = (Logger) LoggerFactory.getLogger(BankSizeEnforcer.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            enforcer.run(new DefaultApplicationArguments());
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(appender.list)
                .anySatisfy(event -> assertThat(event.getFormattedMessage()).contains("activeProfiles=default"));
    }

    private record SimplePoolKey(String topic, String difficulty, String language) implements QuestionPoolKeyView {
        @Override
        public String getTopic() {
            return topic;
        }

        @Override
        public String getDifficulty() {
            return difficulty;
        }

        @Override
        public String getLanguage() {
            return language;
        }
    }
}
