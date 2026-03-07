package com.smartiq.backend.card;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CardService {

    private final CardRepository cardRepository;
    private final QuestionPoolService questionPoolService;
    private final NextRandomCardService nextRandomCardService;

    public CardService(CardRepository cardRepository,
                       QuestionPoolService questionPoolService,
                       NextRandomCardService nextRandomCardService) {
        this.cardRepository = cardRepository;
        this.questionPoolService = questionPoolService;
        this.nextRandomCardService = nextRandomCardService;
    }

    public List<TopicCountResponse> getTopicCounts() {
        return cardRepository.findTopicCountsByLanguagesAndSources(resolvePublicLanguages(), CardSourcePolicy.ALLOWED_SOURCES)
                .stream()
                .map(view -> new TopicCountResponse(view.getTopic(), view.getCount()))
                .toList();
    }

    public CardResponse getRandomCard(String topic) {
        Card card;
        if (topic == null || topic.isBlank()) {
            card = cardRepository.findRandomOverall(CardSourcePolicy.ALLOWED_SOURCES)
                    .orElseThrow(() -> new NoSuchElementException("No cards available"));
        } else {
            card = cardRepository.findRandomByTopic(topic, CardSourcePolicy.ALLOWED_SOURCES)
                    .orElseThrow(() -> new NoSuchElementException("No cards available for topic: " + topic));
        }
        return CardResponse.fromEntity(card);
    }

    public CardResponse getNextCard(String topic, String difficulty, String sessionId, String language) {
        return questionPoolService.nextCard(topic, difficulty, language, sessionId);
    }

    public CardDeckResponse getNextRandomCard(String language, String gameId, String topic) {
        Card card = nextRandomCardService.nextRandom(language, gameId, topic);
        return CardDeckResponseMapper.toDeckResponse(CardResponse.fromEntity(card));
    }

    private List<String> resolvePublicLanguages() {
        List<String> languages = new ArrayList<>();
        languages.add("en");
        if (nextRandomCardService.isLanguageEnabled("et")) {
            languages.add("et");
        }
        return languages;
    }
}
