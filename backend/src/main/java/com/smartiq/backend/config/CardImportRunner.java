package com.smartiq.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartiq.backend.card.AnswerOptionNormalizer;
import com.smartiq.backend.card.Card;
import com.smartiq.backend.card.ContentHealthGuard;
import com.smartiq.backend.card.CardSourcePolicy;
import com.smartiq.backend.card.CardRepository;
import com.smartiq.backend.card.InvalidCardContractException;
import com.smartiq.backend.card.LabelCountView;
import com.smartiq.backend.card.StartupContentHealthReport;
import io.micrometer.core.instrument.MeterRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

@Component
public class CardImportRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CardImportRunner.class);
    private static final String METRIC_DATASET_CATEGORY_BELOW_THRESHOLD = "smartiq.dataset.category.below.threshold";
    private static final String ACTIVE_RUNTIME_LANGUAGE = "en";
    private static final Set<String> SOURCE_CATEGORIES = Set.of(
            "TRUE_FALSE",
            "NUMBER",
            "ORDER",
            "CENTURY_DECADE",
            "COLOR",
            "OPEN"
    );
    private static final Set<String> ACTIVE_RUNTIME_CATEGORIES = Set.of(
            "TRUE_FALSE",
            "NUMBER",
            "CENTURY_DECADE",
            "COLOR",
            "OPEN"
    );
    private static final List<String> RUNTIME_MANAGED_SOURCES = Stream.concat(
            CardSourcePolicy.ALLOWED_SOURCES.stream(),
            CardSourcePolicy.DEPRECATED_SOURCES.stream()
    ).distinct().toList();

    private final CardRepository cardRepository;
    private final ImportProperties importProperties;
    private final ContentHealthGuard contentHealthGuard;
    private final ObjectMapper objectMapper;
    private final int minimumCategoryThreshold;
    private final boolean failOnThreshold;
    private final AtomicInteger belowThresholdCategoryCount;

    public CardImportRunner(CardRepository cardRepository,
                            ImportProperties importProperties,
                            ContentHealthGuard contentHealthGuard,
                            ObjectMapper objectMapper,
                            MeterRegistry meterRegistry,
                            @Value("${smartiq.dataset.min-category-threshold:100}") int minimumCategoryThreshold) {
        this.cardRepository = cardRepository;
        this.importProperties = importProperties;
        this.contentHealthGuard = contentHealthGuard;
        this.objectMapper = objectMapper;
        this.minimumCategoryThreshold = minimumCategoryThreshold;
        this.failOnThreshold = importProperties.failOnCategoryThreshold();
        this.belowThresholdCategoryCount = meterRegistry.gauge(
                METRIC_DATASET_CATEGORY_BELOW_THRESHOLD,
                new AtomicInteger(0)
        );
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        warnIfDeprecatedSourcesDetected();
        ImportAudit audit = new ImportAudit(importProperties.enabled(), importProperties.path());

        try {
            if (importProperties.enabled()) {
                cleanupRuntimeManagedSources();
                resolveImportPaths(importProperties.path())
                        .forEach(importLocation -> audit.record(importLocation(importLocation)));
            }

            DatasetSummary datasetSummary = logDatasetSummary();
            StartupContentHealthReport report = buildStartupContentHealthReport(audit, datasetSummary);
            contentHealthGuard.recordStartupReport(report);
            logCriticalStartupFailure(report);
        } catch (RuntimeException ex) {
            StartupContentHealthReport report = buildImportFailureReport(audit, ex);
            contentHealthGuard.recordStartupReport(report);
            logCriticalStartupFailure(report);
            throw ex;
        }
    }

    private void cleanupRuntimeManagedSources() {
        long removed = cardRepository.deleteBySourcesLower(RUNTIME_MANAGED_SOURCES);
        if (removed > 0) {
            log.info("Removed runtime-managed cards count={} sources={}", removed, RUNTIME_MANAGED_SOURCES);
        }
    }

    private void warnIfDeprecatedSourcesDetected() {
        long deprecatedCount = cardRepository.countBySourcesLower(CardSourcePolicy.DEPRECATED_SOURCES);
        if (deprecatedCount > 0) {
            log.warn("Deprecated card sources detected in DB count={} sources={}", deprecatedCount, CardSourcePolicy.DEPRECATED_SOURCES);
        }
    }

    private DatasetSummary logDatasetSummary() {
        long totalCards = cardRepository.count();
        Map<String, Long> categories = toCountMap(cardRepository.findCategoryCounts());
        Map<String, Long> topics = cardRepository.findTopicCounts().stream()
                .collect(LinkedHashMap::new, (map, item) -> map.put(item.getTopic(), item.getCount()), Map::putAll);
        Map<String, Long> languages = toCountMap(cardRepository.findLanguageCounts());
        long allowedSourceCards = cardRepository.countBySourcesLower(CardSourcePolicy.ALLOWED_SOURCES);
        List<String> belowThreshold = belowThresholdCategories(categories);
        belowThresholdCategoryCount.set(belowThreshold.size());

        log.info("Dataset summary total={} categories={} topics={} languages={} allowedSourceCards={} minCategoryThreshold={} failOnThreshold={} belowThresholdCategoryCount={}",
                totalCards,
                categories,
                topics,
                languages,
                allowedSourceCards,
                minimumCategoryThreshold,
                failOnThreshold,
                belowThreshold.size());

        for (String category : belowThreshold) {
            long count = categories.getOrDefault(category, 0L);
            log.warn("Dataset category below threshold category={} count={} minThreshold={}",
                    category, count, minimumCategoryThreshold);
        }

        if (!belowThreshold.isEmpty() && failOnThreshold) {
            throw new IllegalStateException("Dataset categories below threshold: " + belowThreshold);
        }

        if (!belowThreshold.isEmpty()) {
            log.warn("Dataset threshold warnings will not block startup categories={} minThreshold={} strictDatasetValidation={}",
                    belowThreshold, minimumCategoryThreshold, failOnThreshold);
        }

        return new DatasetSummary(totalCards, allowedSourceCards, topics.size());
    }

    private List<String> belowThresholdCategories(Map<String, Long> categories) {
        List<String> below = new ArrayList<>();
        for (String category : ACTIVE_RUNTIME_CATEGORIES) {
            long count = categories.getOrDefault(category, 0L);
            if (count < minimumCategoryThreshold) {
                below.add(category);
            }
        }
        return below;
    }

    private static Map<String, Long> toCountMap(List<LabelCountView> counts) {
        Map<String, Long> map = new LinkedHashMap<>();
        for (LabelCountView item : counts) {
            map.put(item.getLabel(), item.getCount());
        }
        return map;
    }

    private ImportLocationResult importLocation(String importLocation) {
        if (!StringUtils.hasText(importLocation)) {
            return ImportLocationResult.notFound();
        }
        String trimmed = importLocation.trim();
        if (trimmed.startsWith("classpath:")) {
            return importClasspathResource(trimmed);
        }

        return importPath(Path.of(trimmed).normalize());
    }

    private ImportLocationResult importClasspathResource(String importLocation) {
        String resourcePath = importLocation.substring("classpath:".length()).trim();
        if (!StringUtils.hasText(resourcePath)) {
            return ImportLocationResult.notFound();
        }

        Resource resource = new ClassPathResource(resourcePath);
        if (!resource.exists()) {
            log.warn("Runtime dataset resource missing location={}", importLocation);
            return ImportLocationResult.notFound();
        }

        log.info("Runtime dataset resource found location={}", importLocation);
        return importResource(resource, importLocation);
    }

    private ImportLocationResult importPath(Path importPath) {
        if (!Files.exists(importPath)) {
            log.warn("Runtime dataset path missing location={}", importPath);
            return ImportLocationResult.notFound();
        }

        if (Files.isDirectory(importPath)) {
            List<ImportLocationResult> results = new ArrayList<>();
            try (Stream<Path> fileStream = Files.list(importPath)) {
                fileStream
                        .filter(p -> p.getFileName().toString().endsWith(".json"))
                        .sorted()
                        .forEach(path -> results.add(importFile(path)));
            } catch (IOException ex) {
                throw new IllegalStateException("Failed to import cards from path " + importPath, ex);
            }
            return results.stream()
                    .reduce(ImportLocationResult.notFound(), ImportLocationResult::combine);
        }

        if (importPath.getFileName().toString().endsWith(".json")) {
            return importFile(importPath);
        }
        return ImportLocationResult.notFound();
    }

    private List<String> resolveImportPaths(String importPathRaw) {
        if (!StringUtils.hasText(importPathRaw)) {
            return List.of();
        }

        List<String> paths = new ArrayList<>();
        for (String part : importPathRaw.split(",")) {
            if (!StringUtils.hasText(part)) {
                continue;
            }
            paths.add(part.trim());
        }
        return paths;
    }

    private ImportLocationResult importFile(Path path) {
        try (InputStream inputStream = Files.newInputStream(path)) {
            return importSeedStream(inputStream, path.getFileName().toString());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import cards from " + path, ex);
        }
    }

    private ImportLocationResult importResource(Resource resource, String sourceLabel) {
        try (InputStream inputStream = resource.getInputStream()) {
            return importSeedStream(inputStream, sourceLabel);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import cards from " + sourceLabel, ex);
        }
    }

    private ImportLocationResult importSeedStream(InputStream inputStream, String sourceLabel) {
        try {
            SeedReadResult readResult = readSeeds(inputStream);
            List<CardSeed> seeds = readResult.seeds();
            int inserted = 0;
            int duplicates = 0;
            int invalid = readResult.invalidCount();
            Set<String> importedTopics = new LinkedHashSet<>();

            for (CardSeed seed : seeds) {
                if (cardRepository.existsById(seed.id())) {
                    duplicates++;
                    continue;
                }
                try {
                    cardRepository.save(toEntity(seed));
                    inserted++;
                    importedTopics.add(seed.topic());
                } catch (IllegalArgumentException ex) {
                    invalid++;
                    log.warn("Skipping invalid card id={} sourceFile={} reason={}",
                            seed.id(), sourceLabel, ex.getMessage());
                }
            }

            log.info("Runtime dataset import ready source={} found=true imported={} topicsCreated={}",
                    sourceLabel, inserted, importedTopics.size());
            log.info("Card import completed file={} total={} inserted={} duplicates={} invalid={}",
                    sourceLabel, seeds.size(), inserted, duplicates, invalid);
            return new ImportLocationResult(true, inserted, importedTopics.size());
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to import cards from " + sourceLabel, ex);
        }
    }

    private StartupContentHealthReport buildStartupContentHealthReport(ImportAudit audit, DatasetSummary datasetSummary) {
        List<String> reasons = new ArrayList<>();

        if (audit.importEnabled() && !StringUtils.hasText(audit.importPath())) {
            reasons.add("runtime dataset path is blank");
        }
        if (audit.importEnabled() && !audit.datasetFound()) {
            reasons.add("runtime dataset file not found");
        }
        if (audit.importEnabled() && audit.cardsImported() <= 0) {
            reasons.add("runtime dataset import produced zero cards");
        }
        if (audit.importEnabled() && audit.topicsCreated() <= 0) {
            reasons.add("runtime dataset import produced zero topics");
        }
        if (datasetSummary.allowedSourceCards() <= 0) {
            reasons.add("runtime dataset has zero playable cards");
        }
        if (datasetSummary.publicTopics() <= 0) {
            reasons.add("runtime dataset has zero playable topics");
        }

        boolean healthy = reasons.isEmpty();
        return new StartupContentHealthReport(
                healthy,
                audit.importEnabled(),
                audit.importEnabled(),
                audit.datasetFound(),
                audit.cardsImported(),
                audit.topicsCreated(),
                datasetSummary.allowedSourceCards(),
                datasetSummary.publicTopics(),
                healthy ? "" : ContentHealthGuard.FRONTEND_MESSAGE + " " + String.join("; ", reasons)
        );
    }

    private StartupContentHealthReport buildImportFailureReport(ImportAudit audit, RuntimeException ex) {
        String reason = ContentHealthGuard.FRONTEND_MESSAGE + " import failure: " + ex.getMessage();
        return new StartupContentHealthReport(
                false,
                audit.importEnabled(),
                audit.importEnabled(),
                audit.datasetFound(),
                audit.cardsImported(),
                audit.topicsCreated(),
                0,
                0,
                reason
        );
    }

    private void logCriticalStartupFailure(StartupContentHealthReport report) {
        if (report.healthy()) {
            return;
        }

        log.error("CRITICAL STARTUP CONTENT FAILURE: reason=\"{}\" importEnabled={} datasetFound={} cardsImported={} topicsCreated={} allowedSourceCards={} publicTopics={} importPath={}",
                report.reason(),
                report.importEnabled(),
                report.datasetFound(),
                report.cardsImported(),
                report.topicsCreated(),
                report.allowedSourceCards(),
                report.publicTopics(),
                importProperties.path());
    }

    private SeedReadResult readSeeds(InputStream inputStream) throws IOException {
        JsonNode root = objectMapper.readTree(inputStream);
        if (!root.isArray() || root.isEmpty()) {
            return new SeedReadResult(List.of(), 0);
        }

        JsonNode first = root.get(0);
        if (first.has("cards")) {
            return readFactoryBlocks(root);
        }

        return readFlatCards(root);
    }

    private SeedReadResult readFlatCards(JsonNode root) {
        List<CardSeed> seeds = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();
        int invalid = 0;
        for (JsonNode cardNode : root) {
            String id = textOrNull(cardNode.get("id"));
            try {
                String topic = textOrNull(cardNode.get("topic"));
                String category = normalizeCategory(textOrNull(cardNode.get("category")));
                if (!isActiveRuntimeCategory(category)) {
                    invalid++;
                    continue;
                }
                String language = normalizeLanguage(textOrNull(cardNode.get("language")));
                if (!isActiveRuntimeLanguage(language)) {
                    invalid++;
                    continue;
                }
                String question = textOrNull(cardNode.get("question"));
                String difficulty = normalizeDifficulty(cardNode.get("difficulty"));
                String source = normalizeAllowedSource(textOrNull(cardNode.get("source")));
                requireUniqueId(id, seenIds);

                JsonNode optionsNode = cardNode.get("options");
                if (optionsNode == null || !optionsNode.isArray()) {
                    throw new IllegalArgumentException("Card options must be an array");
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
                seeds.add(normalizeCherryPickSeed(
                        id,
                        topic,
                        category,
                        language,
                        question,
                        options,
                        correctNode,
                        optionFlags,
                        difficulty,
                        source
                ));
            } catch (RuntimeException ex) {
                invalid++;
                log.warn("Skipping invalid card during read id={} reason={}", id, ex.getMessage());
            }
        }
        return new SeedReadResult(seeds, invalid);
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

    private SeedReadResult readFactoryBlocks(JsonNode root) {
        List<CardSeed> seeds = new ArrayList<>();
        Set<String> seenIds = new LinkedHashSet<>();
        int invalid = 0;
        for (JsonNode block : root) {
            String topic = textOrNull(block.get("topic"));
            JsonNode cardsNode = block.get("cards");
            if (cardsNode == null || !cardsNode.isArray()) {
                continue;
            }

            for (JsonNode cardNode : cardsNode) {
                String id = textOrNull(cardNode.get("id"));
                try {
                    String category = normalizeCategory(textOrNull(block.get("category")));
                    String cardCategory = normalizeCategory(fallback(textOrNull(cardNode.get("category")), category));
                    if (!isActiveRuntimeCategory(cardCategory)) {
                        invalid++;
                        continue;
                    }
                    String question = textOrNull(cardNode.get("question"));
                    String language = normalizeLanguage(textOrNull(cardNode.get("language")));
                    if (!isActiveRuntimeLanguage(language)) {
                        invalid++;
                        continue;
                    }
                    String difficulty = normalizeDifficulty(cardNode.get("difficulty"));
                    String source = normalizeAllowedSource(textOrNull(cardNode.get("source")));
                    requireUniqueId(id, seenIds);

                    JsonNode optionsNode = cardNode.get("options");
                    if (optionsNode == null || !optionsNode.isArray()) {
                        throw new IllegalArgumentException("Card options must be an array");
                    }

                    List<String> options = new ArrayList<>();
                    List<Boolean> correctFlags = new ArrayList<>();
                    for (JsonNode optionNode : optionsNode) {
                        options.add(textOrNull(optionNode.get("text")));
                        correctFlags.add(optionNode.path("correct").asBoolean(false));
                    }
                    JsonNode correctNode = cardNode.get("correct");
                    seeds.add(normalizeCherryPickSeed(
                            id,
                            topic,
                            cardCategory,
                            language,
                            question,
                            options,
                            correctNode,
                            correctFlags,
                            difficulty,
                            source
                    ));
                } catch (RuntimeException ex) {
                    invalid++;
                    log.warn("Skipping invalid card during read id={} reason={}", id, ex.getMessage());
                }
            }
        }
        return new SeedReadResult(seeds, invalid);
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

    private CardSeed normalizeCherryPickSeed(String id,
                                             String topic,
                                             String category,
                                             String language,
                                             String question,
                                             List<String> sourceOptions,
                                             JsonNode correctNode,
                                             List<Boolean> optionFlags,
                                             String difficulty,
                                             String source) {
        requireText(id, "Card id is required");
        requireText(topic, "Card topic is required: " + id);
        requireText(question, "Card question is required: " + id);

        List<String> sanitizedOptions = sanitizeSourceOptions(sourceOptions, id);
        List<Integer> sourceCorrectIndexes = resolveSourceCorrectIndexes(correctNode, optionFlags);
        if (sourceCorrectIndexes.isEmpty()) {
            throw new IllegalArgumentException("Card must include at least one correct answer: " + id);
        }
        if (sourceCorrectIndexes.size() > AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
            throw new IllegalArgumentException("Card has too many correct answers for CherryPick board: " + id);
        }
        if (requiresSingleCorrect(category) && sourceCorrectIndexes.size() != 1) {
            throw new IllegalArgumentException("Card must include exactly one correct answer: " + id);
        }

        AnswerOptionNormalizer.Projection projection;
        try {
            projection = AnswerOptionNormalizer.normalize(sanitizedOptions, sourceCorrectIndexes, id);
        } catch (InvalidCardContractException ex) {
            throw new IllegalArgumentException(ex.getMessage(), ex);
        }

        List<Integer> normalizedCorrectIndexes;
        try {
            normalizedCorrectIndexes = projection.normalizedIndexes(sourceCorrectIndexes, id);
        } catch (InvalidCardContractException ex) {
            throw new IllegalArgumentException(ex.getMessage(), ex);
        }

        return new CardSeed(
                id,
                topic,
                category,
                language,
                question,
                projection.options(),
                requiresSingleCorrect(category) ? normalizedCorrectIndexes.get(0) : null,
                normalizeCorrectFlags(normalizedCorrectIndexes, projection.options().size()),
                normalizeCorrectMeta(normalizedCorrectIndexes, category),
                difficulty,
                source,
                Instant.now()
        );
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
        if (!SOURCE_CATEGORIES.contains(category)) {
            throw new IllegalArgumentException("Unsupported card category: " + category);
        }
        return category;
    }

    private boolean isActiveRuntimeCategory(String category) {
        return ACTIVE_RUNTIME_CATEGORIES.contains(category);
    }

    private String normalizeLanguage(String rawLanguage) {
        return fallback(rawLanguage, ACTIVE_RUNTIME_LANGUAGE).trim().toLowerCase(Locale.ROOT);
    }

    private boolean isActiveRuntimeLanguage(String language) {
        return ACTIVE_RUNTIME_LANGUAGE.equals(language);
    }

    private boolean requiresSingleCorrect(String category) {
        return !"TRUE_FALSE".equals(category) && !"OPEN".equals(category);
    }

    private List<String> sanitizeSourceOptions(List<String> sourceOptions, String cardId) {
        if (sourceOptions == null || sourceOptions.size() < AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
            throw new IllegalArgumentException("Card must contain at least 8 options: " + cardId);
        }

        List<String> sanitized = new ArrayList<>(sourceOptions.size());
        for (String option : sourceOptions) {
            if (!StringUtils.hasText(option)) {
                throw new IllegalArgumentException("Card contains blank option text: " + cardId);
            }
            sanitized.add(option.trim());
        }
        return List.copyOf(sanitized);
    }

    private List<Integer> resolveSourceCorrectIndexes(JsonNode correctNode, List<Boolean> optionFlags) {
        List<Integer> indexes = readCorrectIndexes(correctNode, optionFlags);
        if (indexes.isEmpty() && correctNode != null && correctNode.has("correctIndex")) {
            indexes = List.of(correctNode.get("correctIndex").asInt());
        } else if (indexes.isEmpty()) {
            Integer fallbackIndex = singleCorrectIndex(optionFlags);
            if (fallbackIndex != null) {
                indexes = List.of(fallbackIndex);
            }
        }
        return List.copyOf(new LinkedHashSet<>(indexes));
    }

    private String normalizeCorrectFlags(List<Integer> correctIndexes, int optionCount) {
        boolean[] flags = new boolean[optionCount];
        for (Integer index : correctIndexes) {
            if (index == null || index < 0 || index >= optionCount) {
                throw new IllegalArgumentException("Card correctness index is out of bounds");
            }
            flags[index] = true;
        }

        List<String> values = new ArrayList<>(flags.length);
        for (boolean flag : flags) {
            values.add(Boolean.toString(flag));
        }
        return String.join(",", values);
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

    private String normalizeCorrectMeta(List<Integer> correctIndexes, String category) {
        try {
            if (requiresSingleCorrect(category)) {
                return objectMapper.writeValueAsString(Collections.singletonMap("correctIndex", correctIndexes.get(0)));
            }
            return objectMapper.writeValueAsString(Collections.singletonMap("correctIndexes", correctIndexes));
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

    private String normalizeAllowedSource(String rawSource) {
        if (!StringUtils.hasText(rawSource)) {
            throw new IllegalArgumentException("Card source is required");
        }
        String normalized = CardSourcePolicy.normalizeSource(rawSource).toLowerCase(Locale.ROOT);
        if (!CardSourcePolicy.ALLOWED_SOURCES.contains(normalized)) {
            throw new IllegalArgumentException("Unsupported card source: " + normalized);
        }
        return normalized;
    }

    private void requireUniqueId(String id, Set<String> seenIds) {
        requireText(id, "Card id is required");
        if (!seenIds.add(id)) {
            throw new IllegalArgumentException("Duplicate card id in active import: " + id);
        }
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
        if (!isActiveRuntimeCategory(seed.category())) {
            throw new IllegalArgumentException("Card category is not active in CherryPick runtime: " + seed.id());
        }
        if (!isActiveRuntimeLanguage(seed.language())) {
            throw new IllegalArgumentException("Card language is not active in CherryPick runtime: " + seed.id());
        }
        if (seed.options() == null || seed.options().size() != AnswerOptionNormalizer.BOARD_ANSWER_COUNT) {
            throw new IllegalArgumentException("Card must contain exactly 8 options: " + seed.id());
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
        card.setSource(normalizeAllowedSource(seed.source()));
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
            return List.copyOf(options);
        }

    }

    private record SeedReadResult(
            List<CardSeed> seeds,
            int invalidCount
    ) {
    }

    private record ImportLocationResult(
            boolean datasetFound,
            int cardsImported,
            int topicsCreated
    ) {
        private static ImportLocationResult notFound() {
            return new ImportLocationResult(false, 0, 0);
        }

        private ImportLocationResult combine(ImportLocationResult other) {
            return new ImportLocationResult(
                    datasetFound || other.datasetFound,
                    cardsImported + other.cardsImported,
                    topicsCreated + other.topicsCreated
            );
        }
    }

    private record ImportAudit(
            boolean importEnabled,
            String importPath,
            AtomicInteger datasetFoundCounter,
            AtomicInteger cardsImportedCounter,
            AtomicInteger topicsCreatedCounter
    ) {
        private ImportAudit(boolean importEnabled, String importPath) {
            this(importEnabled, importPath, new AtomicInteger(0), new AtomicInteger(0), new AtomicInteger(0));
        }

        private void record(ImportLocationResult result) {
            if (result.datasetFound()) {
                datasetFoundCounter.incrementAndGet();
            }
            cardsImportedCounter.addAndGet(result.cardsImported());
            topicsCreatedCounter.addAndGet(result.topicsCreated());
        }

        private boolean datasetFound() {
            return datasetFoundCounter.get() > 0;
        }

        private int cardsImported() {
            return cardsImportedCounter.get();
        }

        private int topicsCreated() {
            return topicsCreatedCounter.get();
        }
    }

    private record DatasetSummary(
            long totalCards,
            long allowedSourceCards,
            long publicTopics
    ) {
    }
}
