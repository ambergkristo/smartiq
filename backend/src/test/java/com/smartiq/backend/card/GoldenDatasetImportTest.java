package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=../data/clean/golden",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "MIN_BANK_SIZE=1",
        "spring.datasource.url=jdbc:h2:mem:smartiq_golden_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
class GoldenDatasetImportTest {

    @Autowired
    private CardRepository cardRepository;

    @Test
    void importsGoldenDatasetOnStartup() {
        assertThat(cardRepository.count()).isEqualTo(2);
        assertThat(cardRepository.existsById("golden-math-en-1")).isTrue();
        assertThat(cardRepository.existsById("golden-science-en-1")).isTrue();
    }
}
