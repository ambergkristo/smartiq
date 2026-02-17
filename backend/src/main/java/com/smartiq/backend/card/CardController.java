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
}