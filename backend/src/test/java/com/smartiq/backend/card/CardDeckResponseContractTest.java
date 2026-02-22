package com.smartiq.backend.card;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CardDeckResponseContractTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final List<String> OPTIONS = List.of(
            "Alpha",
            "Bravo",
            "Charlie",
            "Delta",
            "Echo",
            "Foxtrot",
            "Golf",
            "Hotel",
            "India",
            "Juliet"
    );

    @Test
    void deckResponseMatchesContractForAllCategories() throws Exception {
        assertContract("OPEN", cardWithCorrectIndex("OPEN", 0));
        assertContract("TRUE_FALSE", cardWithFlags("TRUE_FALSE", "true,false,false,true,false,false,false,false,false,false"));
        assertContract("ORDER", cardWithCorrectMeta("ORDER", "{\"rankByIndex\":[1,0,2,3,4,5,6,7,8,9]}"));
        assertContract("NUMBER", cardWithCorrectIndex("NUMBER", 1));
        assertContract("COLOR", cardWithCorrectIndex("COLOR", 4));
        assertContract("CENTURY_DECADE", cardWithCorrectIndex("CENTURY_DECADE", 7));
    }

    private static void assertContract(String category, CardResponse card) throws Exception {
        CardDeckResponse response = CardDeckResponseMapper.toDeckResponse(card);
        JsonNode actual = OBJECT_MAPPER.valueToTree(response);
        JsonNode expected = readExpected(category);
        assertThat(actual).as("contract for %s", category).isEqualTo(expected);
    }

    private static JsonNode readExpected(String category) throws Exception {
        String resource = "/carddeck/expected_" + category.toLowerCase() + ".json";
        try (InputStream input = CardDeckResponseContractTest.class.getResourceAsStream(resource)) {
            if (input == null) {
                throw new IllegalStateException("Missing contract fixture: " + resource);
            }
            return OBJECT_MAPPER.readTree(input);
        }
    }

    private static CardResponse cardWithCorrectIndex(String category, int correctIndex) {
        return baseCard(category, correctIndex, null, null);
    }

    private static CardResponse cardWithFlags(String category, String flags) {
        return baseCard(category, null, flags, null);
    }

    private static CardResponse cardWithCorrectMeta(String category, String correctMeta) {
        return baseCard(category, null, null, correctMeta);
    }

    private static CardResponse baseCard(String category, Integer correctIndex, String correctFlags, String correctMeta) {
        return new CardResponse(
                "id-" + category.toLowerCase(),
                "deck-" + category.toLowerCase(),
                "Topic",
                "Subtopic",
                category,
                "en",
                "Question for " + category,
                OPTIONS,
                correctIndex,
                "2",
                "smartiq-v2",
                null,
                correctFlags,
                correctMeta
        );
    }
}
