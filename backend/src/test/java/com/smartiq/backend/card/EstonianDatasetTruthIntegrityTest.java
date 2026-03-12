package com.smartiq.backend.card;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = {
        "smartiq.import.enabled=true",
        "smartiq.import.path=../data/smart10/cards.et.json,classpath:data/runtime/cards.et.json",
        "smartiq.pool.enabled=false",
        "smartiq.session.enabled=false",
        "spring.flyway.placeholders.seed_core_enabled=false",
        "spring.datasource.url=jdbc:h2:mem:smartiq_et_truth_test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.username=sa",
        "spring.datasource.password="
})
@AutoConfigureMockMvc
class EstonianDatasetTruthIntegrityTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private CardRepository cardRepository;

    @Test
    void verifiedRuntimeCardsOverrideLowerTrustDuplicateEtIds() {
        Card card = cardRepository.findById("geography-open-015-et").orElseThrow();

        assertThat(card.getSource()).isEqualTo("smartiq-verified");
        assertThat(card.getQuestion()).isEqualTo("Millise riigi pealinn on Lima?");
        assertThat(card.getCorrectIndex()).isEqualTo(7);
        assertThat(card.getOptions()).contains("Indoneesia", "Peruu");
        assertThat(card.getOptions().get(card.getCorrectIndex())).isEqualTo("Peruu");
    }

    @Test
    void knownRuntimeLocaleSamplesPreserveTruthParity() throws Exception {
        Map<String, Map<String, Object>> enCards = runtimeCardsByNormalizedId("/data/runtime/cards.en.json");
        Map<String, Map<String, Object>> etCards = runtimeCardsByNormalizedId("/data/runtime/cards.et.json");

        for (String normalizedId : List.of("geography-open-015", "history-open-001", "science-open-001")) {
            Map<String, Object> en = enCards.get(normalizedId);
            Map<String, Object> et = etCards.get(normalizedId);

            assertThat(en).as("EN sample %s", normalizedId).isNotNull();
            assertThat(et).as("ET sample %s", normalizedId).isNotNull();
            assertThat(en.get("topic")).isEqualTo(et.get("topic"));
            assertThat(en.get("category")).isEqualTo(et.get("category"));
            assertThat(correctIndexes(en)).hasSameSizeAs(correctIndexes(et));
            assertThat(optionTexts(en)).hasSize(optionTexts(et).size());
        }
    }

    @Test
    void capitalCityRegressionKeepsPeruAsCorrectEstonianAnswer() throws Exception {
        Map<String, Object> card = runtimeCardsByNormalizedId("/data/runtime/cards.et.json").get("geography-open-015");

        assertThat(card).isNotNull();
        assertThat(card.get("question")).isEqualTo("Millise riigi pealinn on Lima?");
        assertThat(correctIndexes(card)).containsExactly(7);
        assertThat(optionTexts(card).get(3)).isEqualTo("Indoneesia");
        assertThat(optionTexts(card).get(7)).isEqualTo("Peruu");
    }

    private static Map<String, Map<String, Object>> runtimeCardsByNormalizedId(String resourcePath) throws Exception {
        try (InputStream input = EstonianDatasetTruthIntegrityTest.class.getResourceAsStream(resourcePath)) {
            List<Map<String, Object>> cards = OBJECT_MAPPER.readValue(input, new TypeReference<>() {
            });
            return cards.stream().collect(java.util.stream.Collectors.toMap(
                    card -> normalizeLocaleSuffix(String.valueOf(card.get("id"))),
                    card -> card
            ));
        }
    }

    @SuppressWarnings("unchecked")
    private static List<Integer> correctIndexes(Map<String, Object> card) {
        Object correct = card.get("correct");
        if (!(correct instanceof Map<?, ?> correctMap)) {
            Object options = card.get("options");
            if (!(options instanceof List<?> list)) {
                return List.of();
            }
            java.util.ArrayList<Integer> flagged = new java.util.ArrayList<>();
            for (int index = 0; index < list.size(); index++) {
                Object option = list.get(index);
                if (option instanceof Map<?, ?> map && Boolean.TRUE.equals(((Map<String, Object>) map).get("correct"))) {
                    flagged.add(index);
                }
            }
            return List.copyOf(flagged);
        }
        Object indexes = ((Map<String, Object>) correctMap).get("correctIndexes");
        if (indexes instanceof List<?> list) {
            return list.stream()
                    .filter(Number.class::isInstance)
                    .map(Number.class::cast)
                    .map(Number::intValue)
                    .toList();
        }
        Object index = ((Map<String, Object>) correctMap).get("correctIndex");
        if (index instanceof Number number) {
            return List.of(number.intValue());
        }
        return List.of();
    }

    @SuppressWarnings("unchecked")
    private static List<String> optionTexts(Map<String, Object> card) {
        Object options = card.get("options");
        if (!(options instanceof List<?> list)) {
            return List.of();
        }
        return list.stream()
                .map(option -> {
                    if (option instanceof Map<?, ?> map) {
                        Object text = ((Map<String, Object>) map).get("text");
                        return text == null ? "" : String.valueOf(text);
                    }
                    return String.valueOf(option);
                })
                .toList();
    }

    private static String normalizeLocaleSuffix(String cardId) {
        if (cardId.endsWith("-et")) {
            return cardId.substring(0, cardId.length() - 3);
        }
        if (cardId.endsWith("-en")) {
            return cardId.substring(0, cardId.length() - 3);
        }
        return cardId;
    }
}
