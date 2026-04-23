package com.smartiq.backend.tenant;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartiq.backend.shared.RuntimeLimits;

import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

final class TenantRuntimeSessionCatalogSupport {

    private static final Pattern TEMPLATE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{4,80}$");
    private static final Set<String> ALLOWED_THEMES = Set.of("classic", "ember", "ocean");
    private static final Set<String> ALLOWED_TEMPLATE_LANGUAGES = Set.of("en", "et");
    private static final int MAX_SESSION_TEMPLATE_COUNT = 12;
    private static final int MAX_SESSION_REVIEW_NOTE_COUNT = 24;
    private static final int MAX_SESSION_REVIEW_NOTE_LENGTH = 280;
    private static final int MAX_TEMPLATE_PLAYERS = RuntimeLimits.MAX_PLAYERS_PER_ROOM;
    private static final String DEFAULT_THEME = "classic";

    private final ObjectMapper objectMapper;

    TenantRuntimeSessionCatalogSupport(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    ArrayNode normalizeSessionTemplates(JsonNode sessionTemplatesNode) {
        ArrayNode normalizedTemplates = objectMapper.createArrayNode();
        if (sessionTemplatesNode == null || sessionTemplatesNode.isNull()) {
            return normalizedTemplates;
        }
        if (!(sessionTemplatesNode instanceof ArrayNode templateArray)) {
            throw new IllegalArgumentException("settings.host.sessionTemplates must be a JSON array");
        }
        if (templateArray.size() > MAX_SESSION_TEMPLATE_COUNT) {
            throw new IllegalArgumentException("sessionTemplates must contain at most " + MAX_SESSION_TEMPLATE_COUNT + " templates");
        }
        for (JsonNode templateNode : templateArray) {
            normalizedTemplates.add(normalizeSessionTemplateNode(templateNode));
        }
        return normalizedTemplates;
    }

    ArrayNode normalizeSessionReviewNotes(JsonNode sessionReviewNotesNode) {
        ArrayNode normalizedNotes = objectMapper.createArrayNode();
        if (sessionReviewNotesNode == null || sessionReviewNotesNode.isNull()) {
            return normalizedNotes;
        }
        if (!(sessionReviewNotesNode instanceof ArrayNode noteArray)) {
            throw new IllegalArgumentException("settings.host.sessionReviewNotes must be a JSON array");
        }
        if (noteArray.size() > MAX_SESSION_REVIEW_NOTE_COUNT) {
            throw new IllegalArgumentException(
                    "sessionReviewNotes must contain at most " + MAX_SESSION_REVIEW_NOTE_COUNT + " notes"
            );
        }
        for (JsonNode noteNode : noteArray) {
            normalizedNotes.add(normalizeSessionReviewNoteNode(noteNode));
        }
        return normalizedNotes;
    }

    ObjectNode createSessionTemplateNode(String templateId,
                                         RuntimeSessionTemplateUpsertRequest request,
                                         Instant updatedAt) {
        ObjectNode template = objectMapper.createObjectNode();
        template.put("templateId", normalizeTemplateId(templateId));
        template.put("name", normalizeRequired(request == null ? null : request.name(), "name", 80));
        String topic = normalizeOptional(request == null ? null : request.topic(), 128);
        if (topic == null) {
            template.putNull("topic");
        } else {
            template.put("topic", topic);
        }
        template.put("language", normalizeTemplateLanguage(request == null ? null : request.language()));
        template.put("theme", normalizeTemplateTheme(request == null ? null : request.theme()));
        ArrayNode players = objectMapper.createArrayNode();
        normalizeTemplatePlayers(request == null ? null : request.players()).forEach(players::add);
        template.set("players", players);
        template.put("updatedAt", updatedAt.toString());
        return normalizeSessionTemplateNode(template);
    }

    ObjectNode createSessionReviewNoteNode(String gameId,
                                           RuntimeSessionReviewNoteUpsertRequest request,
                                           Instant updatedAt) {
        ObjectNode note = objectMapper.createObjectNode();
        note.put("gameId", normalizeRequired(gameId, "gameId", 128));
        note.put(
                "note",
                normalizeRequired(request == null ? null : request.note(), "note", MAX_SESSION_REVIEW_NOTE_LENGTH)
        );
        note.put("updatedAt", updatedAt.toString());
        return normalizeSessionReviewNoteNode(note);
    }

    List<RuntimeSessionTemplateResponse> readSessionTemplates(JsonNode settingsNode) {
        JsonNode templateNodes = settingsNode == null
                ? null
                : settingsNode.path("host").path("sessionTemplates");
        if (templateNodes == null || templateNodes.isMissingNode() || templateNodes.isNull()) {
            return List.of();
        }
        if (!(templateNodes instanceof ArrayNode templateArray)) {
            throw new IllegalStateException("stored host.sessionTemplates is invalid");
        }
        ArrayNode normalizedTemplates = normalizeSessionTemplates(templateArray);
        List<RuntimeSessionTemplateResponse> templates = new java.util.ArrayList<>(normalizedTemplates.size());
        for (JsonNode templateNode : normalizedTemplates) {
            templates.add(toSessionTemplateResponse(templateNode));
        }
        return List.copyOf(templates);
    }

    List<RuntimeSessionReviewNoteResponse> readSessionReviewNotes(JsonNode settingsNode) {
        JsonNode noteNodes = settingsNode == null
                ? null
                : settingsNode.path("host").path("sessionReviewNotes");
        if (noteNodes == null || noteNodes.isMissingNode() || noteNodes.isNull()) {
            return List.of();
        }
        if (!(noteNodes instanceof ArrayNode noteArray)) {
            throw new IllegalStateException("stored host.sessionReviewNotes is invalid");
        }
        ArrayNode normalizedNotes = normalizeSessionReviewNotes(noteArray);
        List<RuntimeSessionReviewNoteResponse> notes = new java.util.ArrayList<>(normalizedNotes.size());
        for (JsonNode noteNode : normalizedNotes) {
            notes.add(toSessionReviewNoteResponse(noteNode));
        }
        return List.copyOf(notes);
    }

    ObjectNode toSessionTemplateNode(RuntimeSessionTemplateResponse template) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("templateId", normalizeTemplateId(template.templateId()));
        node.put("name", normalizeRequired(template.name(), "name", 80));
        if (template.topic() == null || template.topic().isBlank()) {
            node.putNull("topic");
        } else {
            node.put("topic", normalizeOptional(template.topic(), 128));
        }
        node.put("language", normalizeTemplateLanguage(template.language()));
        node.put("theme", normalizeTemplateTheme(template.theme()));
        ArrayNode players = objectMapper.createArrayNode();
        normalizeTemplatePlayers(template.players()).forEach(players::add);
        node.set("players", players);
        node.put("updatedAt", normalizeTemplateUpdatedAt(template.updatedAt()));
        return node;
    }

    ObjectNode toSessionReviewNoteNode(RuntimeSessionReviewNoteResponse note) {
        ObjectNode node = objectMapper.createObjectNode();
        node.put("gameId", normalizeRequired(note.gameId(), "gameId", 128));
        node.put("note", normalizeRequired(note.note(), "note", MAX_SESSION_REVIEW_NOTE_LENGTH));
        node.put("updatedAt", normalizeIsoTimestamp(note.updatedAt(), "updatedAt"));
        return node;
    }

    static void ensureNoUnknownKeys(ObjectNode objectNode, Set<String> allowedKeys, String fieldName) {
        for (Iterator<String> it = objectNode.fieldNames(); it.hasNext(); ) {
            String key = it.next();
            if (!allowedKeys.contains(key)) {
                throw new IllegalArgumentException(fieldName + " contains unsupported key: " + key);
            }
        }
    }

    static String readOptionalTheme(ObjectNode root) {
        JsonNode themeNode = root.get("theme");
        String theme = themeNode == null || themeNode.isNull()
                ? DEFAULT_THEME
                : themeNode.asText("").trim().toLowerCase(Locale.ROOT);
        if (theme.isEmpty()) {
            theme = DEFAULT_THEME;
        }
        if (!ALLOWED_THEMES.contains(theme)) {
            throw new IllegalArgumentException("theme must be one of: classic, ember, ocean");
        }
        return theme;
    }

    static int readRequiredInt(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        if (!valueNode.canConvertToInt()) {
            throw new IllegalArgumentException(fieldName + " must be an integer");
        }
        return valueNode.intValue();
    }

    static ObjectNode readOptionalObject(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }
        if (!(valueNode instanceof ObjectNode nestedObject)) {
            throw new IllegalArgumentException(fieldName + " must be a JSON object");
        }
        return nestedObject;
    }

    static int readOptionalInt(ObjectNode objectNode, String fieldName, int defaultValue, int min, int max) {
        if (objectNode == null) {
            return defaultValue;
        }
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return defaultValue;
        }
        if (!valueNode.canConvertToInt()) {
            throw new IllegalArgumentException(fieldName + " must be an integer");
        }
        int value = valueNode.intValue();
        if (value < min || value > max) {
            throw new IllegalArgumentException(fieldName + " must be between " + min + " and " + max);
        }
        return value;
    }

    static boolean readOptionalBoolean(ObjectNode objectNode, String fieldName, boolean defaultValue) {
        if (objectNode == null) {
            return defaultValue;
        }
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return defaultValue;
        }
        if (!valueNode.isBoolean()) {
            throw new IllegalArgumentException(fieldName + " must be a boolean");
        }
        return valueNode.booleanValue();
    }

    private ObjectNode normalizeSessionTemplateNode(JsonNode templateNode) {
        if (!(templateNode instanceof ObjectNode templateObject)) {
            throw new IllegalArgumentException("sessionTemplates entries must be JSON objects");
        }

        String templateId = normalizeTemplateId(readRequiredText(templateObject, "templateId"));
        String name = normalizeRequired(readRequiredText(templateObject, "name"), "name", 80);
        String topic = normalizeOptional(readOptionalText(templateObject, "topic"), 128);
        String language = normalizeTemplateLanguage(readOptionalText(templateObject, "language"));
        String theme = normalizeTemplateTheme(readOptionalText(templateObject, "theme"));
        List<String> players = normalizeTemplatePlayers(templateObject.get("players"));
        String updatedAt = normalizeTemplateUpdatedAt(readOptionalText(templateObject, "updatedAt"));

        ObjectNode normalizedTemplate = objectMapper.createObjectNode();
        normalizedTemplate.put("templateId", templateId);
        normalizedTemplate.put("name", name);
        if (topic == null) {
            normalizedTemplate.putNull("topic");
        } else {
            normalizedTemplate.put("topic", topic);
        }
        normalizedTemplate.put("language", language);
        normalizedTemplate.put("theme", theme);
        ArrayNode normalizedPlayers = objectMapper.createArrayNode();
        players.forEach(normalizedPlayers::add);
        normalizedTemplate.set("players", normalizedPlayers);
        normalizedTemplate.put("updatedAt", updatedAt);
        return normalizedTemplate;
    }

    private ObjectNode normalizeSessionReviewNoteNode(JsonNode noteNode) {
        if (!(noteNode instanceof ObjectNode noteObject)) {
            throw new IllegalArgumentException("sessionReviewNotes entries must be JSON objects");
        }

        String gameId = normalizeRequired(readRequiredText(noteObject, "gameId"), "gameId", 128);
        String note = normalizeRequired(
                readRequiredText(noteObject, "note"),
                "note",
                MAX_SESSION_REVIEW_NOTE_LENGTH
        );
        String updatedAt = normalizeIsoTimestamp(readOptionalText(noteObject, "updatedAt"), "updatedAt");

        ObjectNode normalizedNote = objectMapper.createObjectNode();
        normalizedNote.put("gameId", gameId);
        normalizedNote.put("note", note);
        normalizedNote.put("updatedAt", updatedAt);
        return normalizedNote;
    }

    private RuntimeSessionTemplateResponse toSessionTemplateResponse(JsonNode templateNode) {
        return new RuntimeSessionTemplateResponse(
                templateNode.path("templateId").asText(),
                templateNode.path("name").asText(),
                normalizeOptional(templateNode.path("topic").isNull() ? null : templateNode.path("topic").asText(), 128),
                templateNode.path("language").asText("en"),
                templateNode.path("theme").asText(DEFAULT_THEME),
                normalizeTemplatePlayers(templateNode.get("players")),
                normalizeTemplateUpdatedAt(templateNode.path("updatedAt").asText())
        );
    }

    private RuntimeSessionReviewNoteResponse toSessionReviewNoteResponse(JsonNode noteNode) {
        return new RuntimeSessionReviewNoteResponse(
                normalizeRequired(noteNode.path("gameId").asText(), "gameId", 128),
                normalizeRequired(noteNode.path("note").asText(), "note", MAX_SESSION_REVIEW_NOTE_LENGTH),
                normalizeIsoTimestamp(noteNode.path("updatedAt").asText(), "updatedAt")
        );
    }

    private static String readRequiredText(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        if (!valueNode.isTextual()) {
            throw new IllegalArgumentException(fieldName + " must be a string");
        }
        return valueNode.asText();
    }

    private static String readOptionalText(ObjectNode objectNode, String fieldName) {
        JsonNode valueNode = objectNode.get(fieldName);
        if (valueNode == null || valueNode.isNull()) {
            return null;
        }
        if (!valueNode.isTextual()) {
            throw new IllegalArgumentException(fieldName + " must be a string");
        }
        return valueNode.asText();
    }

    static String normalizeTemplateId(String templateId) {
        String normalized = normalizeRequired(templateId, "templateId", 80);
        if (!TEMPLATE_ID_PATTERN.matcher(normalized).matches()) {
            throw new IllegalArgumentException("templateId must be 4-80 chars and use only letters, numbers, '_' or '-'");
        }
        return normalized;
    }

    private static String normalizeTemplateLanguage(String language) {
        String normalized = normalizeOptional(language, 16);
        if (normalized == null) {
            return "en";
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!ALLOWED_TEMPLATE_LANGUAGES.contains(normalized)) {
            throw new IllegalArgumentException("language must be one of: en, et");
        }
        return normalized;
    }

    private static String normalizeTemplateTheme(String theme) {
        String normalized = normalizeOptional(theme, 32);
        if (normalized == null) {
            return DEFAULT_THEME;
        }
        normalized = normalized.toLowerCase(Locale.ROOT);
        if (!ALLOWED_THEMES.contains(normalized)) {
            throw new IllegalArgumentException("theme must be one of: classic, ember, ocean");
        }
        return normalized;
    }

    private static String normalizeIsoTimestamp(String value, String fieldName) {
        String normalized = normalizeRequired(value, fieldName, 64);
        try {
            return Instant.parse(normalized).toString();
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException(fieldName + " must be an ISO-8601 instant", ex);
        }
    }

    private static String normalizeTemplateUpdatedAt(String value) {
        return value == null || value.isBlank()
                ? Instant.now().toString()
                : normalizeIsoTimestamp(value, "updatedAt");
    }

    private static List<String> normalizeTemplatePlayers(JsonNode playersNode) {
        if (playersNode == null || playersNode.isNull()) {
            return List.of();
        }
        if (!(playersNode instanceof ArrayNode arrayNode)) {
            throw new IllegalArgumentException("players must be a JSON array");
        }
        java.util.LinkedHashSet<String> players = new java.util.LinkedHashSet<>();
        for (JsonNode playerNode : arrayNode) {
            if (playerNode == null || playerNode.isNull() || !playerNode.isTextual()) {
                throw new IllegalArgumentException("players entries must be strings");
            }
            String normalized = normalizeOptional(playerNode.asText(), 160);
            if (normalized != null) {
                players.add(normalized);
            }
        }
        if (players.size() > MAX_TEMPLATE_PLAYERS) {
            throw new IllegalArgumentException("players must contain at most " + MAX_TEMPLATE_PLAYERS + " entries");
        }
        return List.copyOf(players);
    }

    private static List<String> normalizeTemplatePlayers(List<String> players) {
        if (players == null || players.isEmpty()) {
            return List.of();
        }
        java.util.LinkedHashSet<String> normalizedPlayers = new java.util.LinkedHashSet<>();
        for (String player : players) {
            String normalized = normalizeOptional(player, 160);
            if (normalized != null) {
                normalizedPlayers.add(normalized);
            }
        }
        if (normalizedPlayers.size() > MAX_TEMPLATE_PLAYERS) {
            throw new IllegalArgumentException("players must contain at most " + MAX_TEMPLATE_PLAYERS + " entries");
        }
        return List.copyOf(normalizedPlayers);
    }

    private static String normalizeRequired(String value, String fieldName, int maxLength) {
        String normalized = normalizeOptional(value, maxLength);
        if (normalized == null || normalized.isBlank()) {
            throw new IllegalArgumentException(fieldName + " is required");
        }
        return normalized;
    }

    private static String normalizeOptional(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > maxLength) {
            throw new IllegalArgumentException("value exceeds max length " + maxLength);
        }
        return normalized;
    }
}
