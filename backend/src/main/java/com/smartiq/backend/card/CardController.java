package com.smartiq.backend.card;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api")
public class CardController {
    private static final Logger log = LoggerFactory.getLogger(CardController.class);

    private final CardService cardService;

    public CardController(CardService cardService) {
        this.cardService = cardService;
    }

    @GetMapping("/topics")
    public List<TopicCountResponse> getTopics() {
        log.info("api_topics_fetch");
        return cardService.getTopicCounts();
    }

    @GetMapping("/cards/random")
    public ResponseEntity<?> getRandomCard(@RequestParam(name = "topic", required = false) String topic) {
        log.info("api_card_random topic={}", topic == null ? "any" : topic);
        try {
            return ResponseEntity.ok(cardService.getRandomCard(topic));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/cards/next")
    public ResponseEntity<?> getNextCard(@RequestParam(name = "topic", required = false) String topic,
                                         @RequestParam(name = "difficulty", required = false) String difficulty,
                                         @RequestParam(name = "sessionId", required = false) String sessionId,
                                         @RequestParam(name = "lang", required = false) String language) {
        log.info("api_card_next topic={} difficulty={} lang={} hasSession={}",
                topic == null ? "any" : topic,
                difficulty == null ? "any" : difficulty,
                language == null ? "any" : language,
                sessionId != null && !sessionId.isBlank());
        try {
            return ResponseEntity.ok(cardService.getNextCard(topic, difficulty, sessionId, language));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }
}
