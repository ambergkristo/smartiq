package com.smartiq.backend.card;

import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class NextRandomCardServiceTest {

    @Test
    void avoidsSameCategoryTopicAndRecentCardWhenAlternativesExist() {
        Card lastCard = card("card-1", "History", "TRUE_FALSE");
        NextRandomCardService.CardMeta lastMeta = new NextRandomCardService.CardMeta(
                lastCard.getId(),
                NextRandomCardService.resolveCategory(lastCard),
                lastCard.getTopic()
        );

        List<Card> pool = List.of(
                card("card-1", "History", "TRUE_FALSE"),
                card("card-2", "History", "NUMBER"),
                card("card-3", "Sports", "TRUE_FALSE"),
                card("card-4", "Science", "ORDER")
        );

        List<String> relaxed = new ArrayList<>();
        Card selected = NextRandomCardService.pickWithRelaxation(pool, lastMeta, Set.of("card-1"), relaxed);

        assertThat(selected.getId()).isEqualTo("card-4");
        assertThat(NextRandomCardService.resolveCategory(selected)).isNotEqualTo("TRUE_FALSE");
        assertThat(selected.getTopic()).isNotEqualTo("History");
        assertThat(relaxed).isEmpty();
    }

    @Test
    void relaxesConstraintsInOrderWhenPoolIsTooSmall() {
        Card lastCard = card("card-a", "History", "TRUE_FALSE");
        NextRandomCardService.CardMeta lastMeta = new NextRandomCardService.CardMeta(
                lastCard.getId(),
                NextRandomCardService.resolveCategory(lastCard),
                lastCard.getTopic()
        );

        List<Card> pool = List.of(
                card("card-a", "History", "TRUE_FALSE"),
                card("card-b", "History", "TRUE_FALSE")
        );

        List<String> relaxed = new ArrayList<>();
        Card selected = NextRandomCardService.pickWithRelaxation(pool, lastMeta, Set.of("card-a", "card-b"), relaxed);

        assertThat(pool).contains(selected);
        assertThat(relaxed).containsExactly("cardId", "topic", "category");
    }

    private static Card card(String id, String topic, String subtopic) {
        Card card = new Card();
        card.setId(id);
        card.setTopic(topic);
        card.setSubtopic(subtopic);
        return card;
    }
}
