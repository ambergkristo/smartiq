package com.smartiq.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.CardRepository;
import com.smartiq.backend.card.CardSourcePolicy;
import com.smartiq.backend.card.LabelCountView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardImportRunnerTest {

    @Mock
    private CardRepository cardRepository;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
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
                objectMapper,
                100
        );

        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Dataset categories below threshold");
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
}
