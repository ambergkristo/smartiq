package com.smartiq.backend.config;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.CardRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

@Component
public class CardImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CardImportRunner.class);

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
        if (!importProperties.enabled()) {
            return;
        }

        resolveImportPaths(importProperties.path())
                .forEach(this::importPath);
    }

    private void importPath(Path importPath) {
        if (!Files.exists(importPath)) {
            return;
        }

        if (Files.isDirectory(importPath)) {
            try (Stream<Path> fileStream = Files.list(importPath)) {
                fileStream
                        .filter(p -> p.getFileName().toString().endsWith(".json"))
                        .sorted()
                        .forEach(this::importFile);
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to import cards from path " + importPath, ex);
            }
            return;
        }

        if (importPath.getFileName().toString().endsWith(".json")) {
            importFile(importPath);
        }
    }

    private List<Path> resolveImportPaths(String importPathRaw) {
        if (!StringUtils.hasText(importPathRaw)) {
            return List.of();
        }

        List<Path> paths = new ArrayList<>();
        for (String part : importPathRaw.split(",")) {
            if (!StringUtils.hasText(part)) {
                continue;
            }
            paths.add(Path.of(part.trim()).normalize());
        }
        return paths;
    }

    private void importFile(Path path) {
        try {
            List<CardSeed> seeds = readSeeds(path);
            int inserted = 0;
            int duplicates = 0;
            int invalid = 0;

            for (CardSeed seed : seeds) {
                if (cardRepository.existsById(seed.id())) {
                    duplicates++;
                    continue;
                }
                try {
                    cardRepository.save(toEntity(seed));
                    inserted++;
                } catch (IllegalArgumentException ex) {
                    invalid++;
                    log.warn("Skipping invalid card id={} sourceFile={} reason={}",
                            seed.id(), path.getFileName(), ex.getMessage());
                }
            }

            log.info("Card import completed file={} total={} inserted={} duplicates={} invalid={}",
                    path.getFileName(), seeds.size(), inserted, duplicates, invalid);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import cards from " + path, ex);
        }
    }

    private List<CardSeed> readSeeds(Path path) throws IOException {
        JsonNode root = objectMapper.readTree(path.toFile());
        if (!root.isArray() || root.isEmpty()) {
            return List.of();
        }

        JsonNode first = root.get(0);
        if (first.has("cards")) {
            return readFactoryBlocks(root);
        }

        return objectMapper.convertValue(root, new TypeReference<>() {
        });
    }

    private List<CardSeed> readFactoryBlocks(JsonNode root) {
        List<CardSeed> seeds = new ArrayList<>();
        for (JsonNode block : root) {
            String topic = textOrNull(block.get("topic"));
            String category = textOrNull(block.get("category"));
            JsonNode cardsNode = block.get("cards");
            if (cardsNode == null || !cardsNode.isArray()) {
                continue;
            }

            for (JsonNode cardNode : cardsNode) {
                String id = textOrNull(cardNode.get("id"));
                String question = textOrNull(cardNode.get("question"));
                String language = fallback(textOrNull(cardNode.get("language")), "en");
                String difficulty = normalizeDifficulty(cardNode.get("difficulty"));
                String source = fallback(textOrNull(cardNode.get("source")), "smartiq-factory");

                JsonNode optionsNode = cardNode.get("options");
                if (optionsNode == null || !optionsNode.isArray()) {
                    continue;
                }

                List<String> options = new ArrayList<>();
                List<Boolean> correctFlags = new ArrayList<>();
                for (JsonNode optionNode : optionsNode) {
                    options.add(textOrNull(optionNode.get("text")));
                    correctFlags.add(optionNode.path("correct").asBoolean(false));
                }

                Integer correctIndex = singleCorrectIndex(correctFlags);
                seeds.add(new CardSeed(
                        id,
                        topic,
                        category,
                        language,
                        question,
                        options,
                        correctIndex,
                        correctFlags,
                        difficulty,
                        source,
                        Instant.now()
                ));
            }
        }
        return seeds;
    }

    private String normalizeDifficulty(JsonNode node) {
        if (node == null || node.isNull()) {
            return "1";
        }
        if (node.isInt() || node.isLong()) {
            return Integer.toString(node.asInt());
        }
        String value = textOrNull(node);
        return StringUtils.hasText(value) ? value : "1";
    }

    private Integer singleCorrectIndex(List<Boolean> correctFlags) {
        int found = -1;
        for (int i = 0; i < correctFlags.size(); i++) {
            if (Boolean.TRUE.equals(correctFlags.get(i))) {
                if (found != -1) {
                    return null;
                }
                found = i;
            }
        }
        return found == -1 ? null : found;
    }

    private String textOrNull(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        String value = node.asText(null);
        return StringUtils.hasText(value) ? value : null;
    }

    private String fallback(String value, String defaultValue) {
        return StringUtils.hasText(value) ? value : defaultValue;
    }

    private void requireText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalArgumentException(message);
        }
    }

    private Card toEntity(CardSeed seed) {
        requireText(seed.id(), "Card id is required");
        requireText(seed.topic(), "Card topic is required: " + seed.id());
        requireText(seed.language(), "Card language is required: " + seed.id());
        requireText(seed.question(), "Card question is required: " + seed.id());
        requireText(seed.difficulty(), "Card difficulty is required: " + seed.id());
        if (seed.options() == null || seed.options().size() != 10) {
            throw new IllegalArgumentException("Card must contain exactly 10 options: " + seed.id());
        }
        if (seed.correctIndex() == null && (seed.correctFlags() == null || seed.correctFlags().size() != 10)) {
            throw new IllegalArgumentException("Card must include correctIndex or correctFlags: " + seed.id());
        }
        boolean anyCorrect = seed.correctIndex() != null || seed.correctFlags().stream().anyMatch(Boolean::booleanValue);
        if (!anyCorrect) {
            throw new IllegalArgumentException("Card must include at least one correct answer: " + seed.id());
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
        card.setSource(fallback(seed.source(), "smartiq-import"));
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
            if (options == null) {
                return Collections.emptyList();
            }
            return options.stream().filter(Objects::nonNull).toList();
        }

        public List<Boolean> correctFlags() {
            return correctFlags == null ? Collections.emptyList() : correctFlags;
        }
    }
}
