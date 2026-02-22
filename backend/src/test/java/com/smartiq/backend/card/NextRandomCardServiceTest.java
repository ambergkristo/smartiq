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
        DeckCardMeta lastMeta = new DeckCardMeta(
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
        DeckCardMeta lastMeta = new DeckCardMeta(
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

    @Test
    void relaxesOneConstraintAtATimeBeforeFallingBackFurther() {
        Card lastCard = card("last", "History", "TRUE_FALSE");
        DeckCardMeta lastMeta = new DeckCardMeta(
                lastCard.getId(),
                NextRandomCardService.resolveCategory(lastCard),
                lastCard.getTopic()
        );

        List<String> relaxedCardIdOnly = new ArrayList<>();
        Card cardIdRelaxedSelected = NextRandomCardService.pickWithRelaxation(
                List.of(
                        card("last", "History", "TRUE_FALSE"),
                        card("new-1", "Sports", "NUMBER")
                ),
                lastMeta,
                Set.of("new-1"),
                relaxedCardIdOnly
        );
        assertThat(cardIdRelaxedSelected.getId()).isEqualTo("new-1");
        assertThat(relaxedCardIdOnly).containsExactly("cardId");

        List<String> relaxedCardIdAndTopic = new ArrayList<>();
        Card topicRelaxedSelected = NextRandomCardService.pickWithRelaxation(
                List.of(
                        card("new-2", "History", "NUMBER")
                ),
                lastMeta,
                Set.of("new-2"),
                relaxedCardIdAndTopic
        );
        assertThat(topicRelaxedSelected.getId()).isEqualTo("new-2");
        assertThat(relaxedCardIdAndTopic).containsExactly("cardId", "topic");

        List<String> relaxedAll = new ArrayList<>();
        Card categoryRelaxedSelected = NextRandomCardService.pickWithRelaxation(
                List.of(
                        card("new-3", "History", "TRUE_FALSE")
                ),
                lastMeta,
                Set.of("new-3"),
                relaxedAll
        );
        assertThat(categoryRelaxedSelected.getId()).isEqualTo("new-3");
        assertThat(relaxedAll).containsExactly("cardId", "topic", "category");
    }

    private static Card card(String id, String topic, String subtopic) {
        Card card = new Card();
        card.setId(id);
        card.setTopic(topic);
        card.setSubtopic(subtopic);
        return card;
    }
}
