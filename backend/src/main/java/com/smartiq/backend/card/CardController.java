package com.smartiq.backend.card;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

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
    public ResponseEntity<?> getRandomCard(@RequestParam(name = "topic", required = false) String topic) {
        try {
            return ResponseEntity.ok(cardService.getRandomCard(topic));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/cards/next")
    public ResponseEntity<?> getNextCard(@RequestParam(name = "topicId", required = false) String topicId,
                                         @RequestParam(name = "topic", required = false) String topic,
                                         @RequestParam(name = "difficulty", defaultValue = "1") String difficulty,
                                         @RequestParam(name = "sessionId", required = false) String sessionId,
                                         @RequestParam(name = "lang", defaultValue = "en") String language,
                                         @RequestParam(name = "v", defaultValue = "1") int version) {
        try {
            String resolvedTopic = resolveTopic(topicId, topic);
            CardResponse card = cardService.getNextCard(resolvedTopic, difficulty, sessionId, language);
            if (version == 1) {
                return ResponseEntity.ok(card);
            }
            if (version == 2) {
                return ResponseEntity.ok(CardResponseV2Mapper.toV2(card));
            }
            throw new IllegalArgumentException("Unsupported API version: " + version);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (InvalidCardContractException ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/cards/nextRandom")
    public ResponseEntity<?> getNextRandomCard(@RequestParam(name = "language") String language,
                                               @RequestParam(name = "gameId") String gameId,
                                               @RequestParam(name = "topic", required = false) String topic) {
        try {
            return ResponseEntity.ok(cardService.getNextRandomCard(language, gameId, topic));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (NoSuchElementException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        }
    }

    private static String resolveTopic(String topicId, String legacyTopic) {
        if (topicId != null && !topicId.isBlank()) {
            return topicId.trim();
        }
        if (legacyTopic != null && !legacyTopic.isBlank()) {
            return legacyTopic.trim();
        }
        throw new IllegalArgumentException("topicId is required");
    }
}
