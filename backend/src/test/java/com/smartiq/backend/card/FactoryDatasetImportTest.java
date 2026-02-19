package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=src/test/resources/import/factory",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "MIN_BANK_SIZE=1",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_factory_import_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
class FactoryDatasetImportTest {

    @Autowired
    private CardRepository cardRepository;

    @Test
    void importsFactoryDatasetBlocksOnStartup() {
        assertThat(cardRepository.count()).isEqualTo(2);

        Card first = cardRepository.findById("science_truefalse_001").orElseThrow();
        assertThat(first.getTopic()).isEqualTo("Science");
        assertThat(first.getSubtopic()).isEqualTo("TRUE_FALSE");
        assertThat(first.getDifficulty()).isEqualTo("2");
        assertThat(first.getOptions()).hasSize(10);
        assertThat(first.getCorrectIndex()).isNull();
        assertThat(first.getCorrectFlags()).contains("true");

        Card second = cardRepository.findById("science_number_001").orElseThrow();
        assertThat(second.getDifficulty()).isEqualTo("1");
        assertThat(second.getCorrectIndex()).isEqualTo(0);
    }
}

