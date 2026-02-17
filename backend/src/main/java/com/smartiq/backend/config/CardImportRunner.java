package com.smartiq.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.CardRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Component
public class CardImportRunner implements ApplicationRunner {

    private final CardRepository cardRepository;
    private final ImportProperties importProperties;
    private final ObjectMapper objectMapper;

    public CardImportRunner(CardRepository cardRepository, ImportProperties importProperties, ObjectMapper objectMapper) {
        this.cardRepository = cardRepository;
        this.importProperties = importProperties;
        this.objectMapper = objectMapper;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!importProperties.enabled() || cardRepository.count() > 0) {
            return;
        }

        Path importPath = Path.of(importProperties.path()).normalize();
        if (!Files.exists(importPath)) {
            return;
        }

        try (var fileStream = Files.list(importPath)) {
            fileStream
                    .filter(p -> p.getFileName().toString().endsWith(".json"))
                    .sorted()
                    .forEach(this::importFile);
        }
    }

    private void importFile(Path path) {
        try {
            List<CardSeed> seeds = objectMapper.readValue(Files.readString(path), new TypeReference<>() {
            });
            for (CardSeed seed : seeds) {
                if (cardRepository.existsById(seed.id())) {
                    continue;
                }
                cardRepository.save(toEntity(seed));
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import cards from " + path, ex);
        }
    }

    private Card toEntity(CardSeed seed) {
        if (seed.options() == null || seed.options().size() != 10) {
            throw new IllegalArgumentException("Card must contain exactly 10 options: " + seed.id());
        }
        if (seed.correctIndex() == null && (seed.correctFlags() == null || seed.correctFlags().size() != 10)) {
            throw new IllegalArgumentException("Card must include correctIndex or correctFlags: " + seed.id());
        }

        Card card = new Card();
        card.setId(seed.id());
        card.setTopic(seed.topic());
        card.setSubtopic(seed.subtopic());
        card.setLanguage(seed.language());
        card.setQuestion(seed.question());
        card.setOptions(seed.options());
        card.setCorrectIndex(seed.correctIndex());
        card.setCorrectFlags(seed.correctFlags() == null ? null : String.join(",", seed.correctFlags().stream().map(String::valueOf).toList()));
        card.setDifficulty(seed.difficulty());
        card.setSource(seed.source());
        card.setCreatedAt(seed.createdAt() == null ? Instant.now() : seed.createdAt());
        return card;
    }

    private record CardSeed(
            String id,
            String topic,
            String subtopic,
            String language,
            String question,
            List<String> options,
            Integer correctIndex,
            List<Boolean> correctFlags,
            String difficulty,
            String source,
            Instant createdAt
    ) {
        public List<String> options() {
            return options == null ? Collections.emptyList() : options;
        }

        public List<Boolean> correctFlags() {
            return correctFlags == null ? Collections.emptyList() : correctFlags;
        }
    }
}