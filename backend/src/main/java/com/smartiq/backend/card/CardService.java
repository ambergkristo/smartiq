package com.smartiq.backend.card;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CardService {

    private final CardRepository cardRepository;

    public CardService(CardRepository cardRepository) {
        this.cardRepository = cardRepository;
    }

    public List<TopicCountResponse> getTopicCounts() {
        return cardRepository.findTopicCounts()
                .stream()
                .map(view -> new TopicCountResponse(view.getTopic(), view.getCount()))
                .toList();
    }

    public CardResponse getRandomCard(String topic) {
        Card card;
        if (topic == null || topic.isBlank()) {
            card = cardRepository.findRandomOverall().orElseThrow(() -> new NoSuchElementException("No cards available"));
        } else {
            card = cardRepository.findRandomByTopic(topic).orElseThrow(() -> new NoSuchElementException("No cards available for topic: " + topic));
        }
        return CardResponse.fromEntity(card);
    }
}