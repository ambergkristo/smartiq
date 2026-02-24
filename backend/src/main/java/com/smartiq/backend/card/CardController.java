package com.smartiq.backend.card;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.core.env.Environment;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api")
public class CardController {
    private static final Logger log = LoggerFactory.getLogger(CardController.class);

    private static final String DEPRECATION_LINK = "</api/cards/nextRandom>; rel=\"successor-version\"";
    private static final String SUNSET_DATE = "Thu, 31 Dec 2026 23:59:59 GMT";

    private final CardService cardService;
    private final Environment environment;

    public CardController(CardService cardService, Environment environment) {
        this.cardService = cardService;
        this.environment = environment;
    }

    @GetMapping("/topics")
    public List<TopicCountResponse> getTopics() {
        log.info("api_topics_fetch");
        return cardService.getTopicCounts();
    }

    @GetMapping("/cards/random")
    public ResponseEntity<?> getRandomCard(@RequestParam(name = "topic", required = false) String topic) {
        log.info("api_card_random topic={}", topic == null ? "any" : topic);
        return legacyResponse(HttpStatus.OK).body(cardService.getRandomCard(topic));
    }

    @GetMapping("/cards/next")
    public ResponseEntity<?> getNextCard(@RequestParam(name = "topicId", required = false) String topicId,
                                         @RequestParam(name = "topic", required = false) String topic,
                                         @RequestParam(name = "difficulty", defaultValue = "1") String difficulty,
                                         @RequestParam(name = "sessionId", required = false) String sessionId,
                                         @RequestParam(name = "lang", defaultValue = "en") String language,
                                         @RequestParam(name = "v", defaultValue = "1") int version) {
        String resolvedTopic = resolveTopic(topicId, topic);
        CardResponse card = cardService.getNextCard(resolvedTopic, difficulty, sessionId, language);
        if (version == 1) {
            return legacyResponse(HttpStatus.OK).body(card);
        }
        if (version == 2) {
            return legacyResponse(HttpStatus.OK).body(CardResponseV2Mapper.toV2(card));
        }
        throw new IllegalArgumentException("Unsupported API version: " + version);
    }

    @GetMapping("/cards/nextRandom")
    public ResponseEntity<?> getNextRandomCard(@RequestParam(name = "language") String language,
                                               @RequestParam(name = "gameId") String gameId,
                                               @RequestParam(name = "topic", required = false) String topic) {
        return ResponseEntity.ok(cardService.getNextRandomCard(language, gameId, topic));
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

    private ResponseEntity.BodyBuilder legacyResponse(HttpStatus status) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(status);
        if (isProdProfile()) {
            builder.header("Deprecation", "true");
            builder.header("Sunset", SUNSET_DATE);
            builder.header(HttpHeaders.LINK, DEPRECATION_LINK);
        }
        return builder;
    }

    private boolean isProdProfile() {
        return List.of(environment.getActiveProfiles()).contains("prod");
    }
}
