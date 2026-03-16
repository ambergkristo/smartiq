package com.smartiq.backend.config;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.CardRepository;
import com.smartiq.backend.card.CardSourcePolicy;
import com.smartiq.backend.card.ContentHealthGuard;
import com.smartiq.backend.card.LabelCountView;
import com.smartiq.backend.card.StartupContentHealthReport;
import com.smartiq.backend.card.TopicCountView;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import org.slf4j.LoggerFactory;

@ExtendWith(MockitoExtension.class)
class CardImportRunnerTest {

    @Mock
    private CardRepository cardRepository;

    @Mock
    private ContentHealthGuard contentHealthGuard;

    private ObjectMapper objectMapper;
    private SimpleMeterRegistry meterRegistry;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        meterRegistry = new SimpleMeterRegistry();
    }

    @Test
    void failsWhenCategoryThresholdsMissingAndFailOnEnabled() {
        when(cardRepository.countBySourcesLower(CardSourcePolicy.DEPRECATED_SOURCES)).thenReturn(0L);
        when(cardRepository.count()).thenReturn(0L);
        when(cardRepository.findCategoryCounts()).thenReturn(List.of(new SimpleLabelCount("OPEN", 0L)));
        when(cardRepository.findTopicCounts()).thenReturn(List.of());
        when(cardRepository.findLanguageCounts()).thenReturn(List.of());
        when(cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES)).thenReturn(0L);

        CardImportRunner runner = new CardImportRunner(
                cardRepository,
                new ImportProperties(false, "", true),
                contentHealthGuard,
                objectMapper,
                meterRegistry,
                100
        );

        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Dataset categories below threshold");
    }

    @Test
    void recordsCountOfCategoriesBelowThresholdAsMetricAndWarnsWithoutFailing() throws Exception {
        when(cardRepository.countBySourcesLower(CardSourcePolicy.DEPRECATED_SOURCES)).thenReturn(0L);
        when(cardRepository.count()).thenReturn(130L);
        when(cardRepository.findCategoryCounts()).thenReturn(List.of(
                new SimpleLabelCount("OPEN", 120L),
                new SimpleLabelCount("NUMBER", 10L)
        ));
        when(cardRepository.findTopicCounts()).thenReturn(List.of());
        when(cardRepository.findLanguageCounts()).thenReturn(List.of());
        when(cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES)).thenReturn(130L);

        CardImportRunner runner = new CardImportRunner(
                cardRepository,
                new ImportProperties(false, "", false),
                contentHealthGuard,
                objectMapper,
                meterRegistry,
                100
        );

        Logger logger = (Logger) LoggerFactory.getLogger(CardImportRunner.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            runner.run(new DefaultApplicationArguments());
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(meterRegistry.get("smartiq.dataset.category.below.threshold").gauge().value())
                .isEqualTo(4.0);
        assertThat(appender.list)
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.WARN);
                    assertThat(event.getFormattedMessage()).contains("Dataset category below threshold");
                })
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.WARN);
                    assertThat(event.getFormattedMessage()).contains("Dataset threshold warnings will not block startup");
                });
    }

    @Test
    void logsRuntimeDatasetStartupConfirmationForClasspathImport() throws Exception {
        when(cardRepository.countBySourcesLower(CardSourcePolicy.DEPRECATED_SOURCES)).thenReturn(0L);
        when(cardRepository.deleteBySourcesLower(any())).thenReturn(0);
        when(cardRepository.existsById(any())).thenReturn(false);
        when(cardRepository.count()).thenReturn(1L);
        when(cardRepository.findCategoryCounts()).thenReturn(List.of(new SimpleLabelCount("OPEN", 1L)));
        when(cardRepository.findTopicCounts()).thenReturn(List.of(new SimpleTopicCount("History", 1L)));
        when(cardRepository.findLanguageCounts()).thenReturn(List.of(new SimpleLabelCount("en", 1L)));
        when(cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES)).thenReturn(1L);

        CardImportRunner runner = new CardImportRunner(
                cardRepository,
                new ImportProperties(true, "classpath:import/cherrypick/cards.en.json", false),
                contentHealthGuard,
                objectMapper,
                meterRegistry,
                0
        );

        Logger logger = (Logger) LoggerFactory.getLogger(CardImportRunner.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            runner.run(new DefaultApplicationArguments());
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(appender.list)
                .anySatisfy(event -> assertThat(event.getFormattedMessage())
                        .contains("Runtime dataset resource found location=classpath:import/cherrypick/cards.en.json"))
                .anySatisfy(event -> assertThat(event.getFormattedMessage())
                        .contains("Runtime dataset import ready source=classpath:import/cherrypick/cards.en.json found=true imported=2 topicsCreated=2"));
        verify(contentHealthGuard).recordStartupReport(argThat(StartupContentHealthReport::healthy));
    }

    @Test
    void recordsCriticalStartupFailureWhenRuntimeContentIsEmpty() throws Exception {
        when(cardRepository.countBySourcesLower(CardSourcePolicy.DEPRECATED_SOURCES)).thenReturn(0L);
        when(cardRepository.deleteBySourcesLower(any())).thenReturn(0);
        when(cardRepository.count()).thenReturn(0L);
        when(cardRepository.findCategoryCounts()).thenReturn(List.of());
        when(cardRepository.findTopicCounts()).thenReturn(List.of());
        when(cardRepository.findLanguageCounts()).thenReturn(List.of());
        when(cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES)).thenReturn(0L);

        CardImportRunner runner = new CardImportRunner(
                cardRepository,
                new ImportProperties(true, "classpath:import/cherrypick/missing.json", false),
                contentHealthGuard,
                objectMapper,
                meterRegistry,
                0
        );

        Logger logger = (Logger) LoggerFactory.getLogger(CardImportRunner.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            runner.run(new DefaultApplicationArguments());
        } finally {
            logger.detachAppender(appender);
        }

        assertThat(appender.list)
                .anySatisfy(event -> {
                    assertThat(event.getLevel()).isEqualTo(Level.ERROR);
                    assertThat(event.getFormattedMessage()).contains("CRITICAL STARTUP CONTENT FAILURE");
                    assertThat(event.getFormattedMessage()).contains("datasetFound=false");
                    assertThat(event.getFormattedMessage()).contains("cardsImported=0");
                    assertThat(event.getFormattedMessage()).contains("topicsCreated=0");
                });
        verify(contentHealthGuard).recordStartupReport(argThat(report ->
                !report.healthy()
                        && !report.datasetFound()
                        && report.cardsImported() == 0
                        && report.topicsCreated() == 0
        ));
    }

    private static final class SimpleLabelCount implements LabelCountView {
        private final String label;
        private final long count;

        private SimpleLabelCount(String label, long count) {
            this.label = label;
            this.count = count;
        }

        @Override
        public String getLabel() {
            return label;
        }

        @Override
        public long getCount() {
            return count;
        }
    }

    private static final class SimpleTopicCount implements TopicCountView {
        private final String topic;
        private final long count;

        private SimpleTopicCount(String topic, long count) {
            this.topic = topic;
            this.count = count;
        }

        @Override
        public String getTopic() {
            return topic;
        }

        @Override
        public long getCount() {
            return count;
        }
    }
}
