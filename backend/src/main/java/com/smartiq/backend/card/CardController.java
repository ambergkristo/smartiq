package com.smartiq.backend.card;

import jakarta.validation.constraints.Pattern;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api")
public class CardController {

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping("/topics")
    public List<TopicCountResponse> getTopics() {
        return cardService.getTopicCounts();
    }

    @GetMapping("/cards/random")
    public CardResponse getRandomCard(@RequestParam(name = "topic", required = false) String topic) {
        return cardService.getRandomCard(topic);
    }

    @GetMapping("/cards/next")
    public CardResponse getNextCard(@RequestParam(name = "topic", required = false) String topic,
                                         @RequestParam(name = "difficulty", required = false)
                                         @Pattern(regexp = "^(?:[1-3]|easy|medium|hard)$", message = "difficulty must be 1-3 or easy/medium/hard")
                                         String difficulty,
                                         @RequestParam(name = "sessionId", required = false) String sessionId,
                                         @RequestParam(name = "lang", required = false)
                                         @Pattern(regexp = "^[a-z]{2}$", message = "lang must be two lowercase letters")
                                         String language) {
        return cardService.getNextCard(topic, difficulty, sessionId, language);
    }
}
