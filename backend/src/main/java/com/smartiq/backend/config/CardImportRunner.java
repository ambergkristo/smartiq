package com.smartiq.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

@Component
public class CardImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CardImportRunner.class);
    private static final Set<String> VALID_CATEGORIES = Set.of(
            "TRUE_FALSE",
            "NUMBER",
            "ORDER",
            "CENTURY_DECADE",
            "COLOR",
            "OPEN"
    );

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

        return readFlatCards(root);
    }

    private List<CardSeed> readFlatCards(JsonNode root) {
        List<CardSeed> seeds = new ArrayList<>();
        for (JsonNode cardNode : root) {
            String id = textOrNull(cardNode.get("id"));
            String topic = textOrNull(cardNode.get("topic"));
            String category = normalizeCategory(textOrNull(cardNode.get("category")));
            String language = fallback(textOrNull(cardNode.get("language")), "en");
            String question = textOrNull(cardNode.get("question"));
            String difficulty = normalizeDifficulty(cardNode.get("difficulty"));
            String source = fallback(textOrNull(cardNode.get("source")), "smartiq-import");

            JsonNode optionsNode = cardNode.get("options");
            if (optionsNode == null || !optionsNode.isArray()) {
                continue;
            }
            List<String> options = new ArrayList<>();
            List<Boolean> optionFlags = new ArrayList<>();
            for (JsonNode optionNode : optionsNode) {
                if (optionNode.isObject()) {
                    options.add(textOrNull(optionNode.get("text")));
                    optionFlags.add(optionNode.path("correct").asBoolean(false));
                } else {
                    options.add(textOrNull(optionNode));
                    optionFlags.add(false);
                }
            }

            JsonNode correctNode = cardNode.get("correct");
            if (correctNode == null || correctNode.isNull()) {
                correctNode = legacyCorrectNode(cardNode);
            }
            String correctMeta = normalizeCorrectMeta(correctNode, category, optionFlags);
            Integer correctIndex = resolveCorrectIndex(correctNode, category, optionFlags);
            String correctFlags = resolveCorrectFlags(correctNode, category, optionFlags);

            seeds.add(new CardSeed(
                    id,
                    topic,
                    category,
                    language,
                    question,
                    options,
                    correctIndex,
                    correctFlags,
                    correctMeta,
                    difficulty,
                    source,
                    Instant.now()
            ));
        }
        return seeds;
    }

    private JsonNode legacyCorrectNode(JsonNode cardNode) {
        ObjectNode node = objectMapper.createObjectNode();
        boolean hasAny = false;

        JsonNode correctIndexNode = cardNode.get("correctIndex");
        if (correctIndexNode != null && correctIndexNode.isNumber()) {
            node.put("correctIndex", correctIndexNode.asInt());
            hasAny = true;
        }

        JsonNode correctFlagsNode = cardNode.get("correctFlags");
        if (correctFlagsNode != null && correctFlagsNode.isArray()) {
            ArrayNode indexes = node.putArray("correctIndexes");
            for (int i = 0; i < correctFlagsNode.size(); i++) {
                if (correctFlagsNode.get(i).asBoolean(false)) {
                    indexes.add(i);
                }
            }
            hasAny = indexes.size() > 0;
        }

        JsonNode correctOrderNode = cardNode.get("correctOrder");
        if (correctOrderNode != null && correctOrderNode.isArray()) {
            node.set("correctOrder", correctOrderNode.deepCopy());
            hasAny = true;
        }

        return hasAny ? node : null;
    }

    private List<CardSeed> readFactoryBlocks(JsonNode root) {
        List<CardSeed> seeds = new ArrayList<>();
        for (JsonNode block : root) {
            String topic = textOrNull(block.get("topic"));
            String category = normalizeCategory(textOrNull(block.get("category")));
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
                String cardCategory = normalizeCategory(fallback(textOrNull(cardNode.get("category")), category));

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

                JsonNode correctNode = cardNode.get("correct");
                String correctMeta = normalizeCorrectMeta(correctNode, cardCategory, correctFlags);
                Integer correctIndex = resolveCorrectIndex(correctNode, cardCategory, correctFlags);
                String correctFlagsRaw = resolveCorrectFlags(correctNode, cardCategory, correctFlags);
                seeds.add(new CardSeed(
                        id,
                        topic,
                        cardCategory,
                        language,
                        question,
                        options,
                        correctIndex,
                        correctFlagsRaw,
                        correctMeta,
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

    private String normalizeCategory(String rawCategory) {
        String category = fallback(rawCategory, "OPEN").toUpperCase();
        if (!VALID_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Unsupported card category: " + category);
        }
        return category;
    }

    private Integer resolveCorrectIndex(JsonNode correctNode, String category, List<Boolean> optionFlags) {
        if ("TRUE_FALSE".equals(category) || "ORDER".equals(category)) {
            return null;
        }

        if (correctNode != null && correctNode.has("correctIndex")) {
            return correctNode.get("correctIndex").asInt();
        }
        return singleCorrectIndex(optionFlags);
    }

    private String resolveCorrectFlags(JsonNode correctNode, String category, List<Boolean> optionFlags) {
        if ("TRUE_FALSE".equals(category)) {
            List<Integer> indexes = readCorrectIndexes(correctNode, optionFlags);
            boolean[] flags = new boolean[optionFlags.size()];
            for (Integer index : indexes) {
                if (index >= 0 && index < flags.length) {
                    flags[index] = true;
                }
            }
            List<String> values = new ArrayList<>(flags.length);
            for (boolean flag : flags) {
                values.add(Boolean.toString(flag));
            }
            return String.join(",", values);
        }

        if (optionFlags.stream().anyMatch(Boolean::booleanValue)) {
            return String.join(",", optionFlags.stream().map(String::valueOf).toList());
        }
        return null;
    }

    private List<Integer> readCorrectIndexes(JsonNode correctNode, List<Boolean> optionFlags) {
        if (correctNode != null && correctNode.has("correctIndexes")) {
            JsonNode array = correctNode.get("correctIndexes");
            List<Integer> indexes = new ArrayList<>();
            if (array.isArray()) {
                array.forEach(item -> indexes.add(item.asInt()));
            }
            return List.copyOf(new LinkedHashSet<>(indexes));
        }

        List<Integer> indexes = new ArrayList<>();
        for (int i = 0; i < optionFlags.size(); i++) {
            if (Boolean.TRUE.equals(optionFlags.get(i))) {
                indexes.add(i);
            }
        }
        return indexes;
    }

    private String normalizeCorrectMeta(JsonNode correctNode, String category, List<Boolean> optionFlags) {
        try {
            if (correctNode != null && !correctNode.isNull()) {
                return objectMapper.writeValueAsString(correctNode);
            }

            if ("TRUE_FALSE".equals(category)) {
                return objectMapper.writeValueAsString(Collections.singletonMap("correctIndexes", readCorrectIndexes(null, optionFlags)));
            }

            if ("ORDER".equals(category)) {
                throw new IllegalArgumentException("ORDER cards require correct metadata");
            }

            Integer idx = singleCorrectIndex(optionFlags);
            if (idx != null) {
                return objectMapper.writeValueAsString(Collections.singletonMap("correctIndex", idx));
            }

            return null;
        } catch (Exception ex) {
            throw new IllegalArgumentException("Failed to serialize correctness metadata", ex);
        }
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
        requireText(seed.category(), "Card category is required: " + seed.id());
        requireText(seed.language(), "Card language is required: " + seed.id());
        requireText(seed.question(), "Card question is required: " + seed.id());
        requireText(seed.difficulty(), "Card difficulty is required: " + seed.id());
        if (seed.options() == null || seed.options().size() != 10) {
            throw new IllegalArgumentException("Card must contain exactly 10 options: " + seed.id());
        }
        if (seed.correctIndex() == null && !StringUtils.hasText(seed.correctFlags()) && !StringUtils.hasText(seed.correctMeta())) {
            throw new IllegalArgumentException("Card must include correctness metadata: " + seed.id());
        }
        boolean anyCorrect = seed.correctIndex() != null || StringUtils.hasText(seed.correctFlags()) || StringUtils.hasText(seed.correctMeta());
        if (!anyCorrect) {
            throw new IllegalArgumentException("Card must include at least one correct answer: " + seed.id());
        }

        Card card = new Card();
        card.setId(seed.id());
        card.setTopic(seed.topic());
        card.setSubtopic(seed.category());
        card.setCategory(seed.category());
        card.setLanguage(seed.language());
        card.setQuestion(seed.question());
        card.setOptions(seed.options());
        card.setCorrectIndex(seed.correctIndex());
        card.setCorrectFlags(seed.correctFlags());
        card.setCorrectMeta(seed.correctMeta());
        card.setDifficulty(seed.difficulty());
        card.setSource(fallback(seed.source(), "smartiq-import"));
        card.setCreatedAt(seed.createdAt() == null ? Instant.now() : seed.createdAt());
        return card;
    }

    private record CardSeed(
            String id,
            String topic,
            String category,
            String language,
            String question,
            List<String> options,
            Integer correctIndex,
            String correctFlags,
            String correctMeta,
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

    }
}
