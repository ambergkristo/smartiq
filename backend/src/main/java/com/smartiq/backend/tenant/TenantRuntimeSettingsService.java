package com.smartiq.backend.tenant;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smartiq.backend.shared.RuntimeLimits;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;

@Service
class TenantRuntimeSettingsService {

    private static final Set<String> ALLOWED_SETTINGS_KEYS = Set.of("schemaVersion", "theme", "game", "features", "host");
    private static final Set<String> ALLOWED_GAME_SETTINGS_KEYS = Set.of("maxPlayers", "roundsPerMatch");
    private static final Set<String> ALLOWED_FEATURE_SETTINGS_KEYS = Set.of("leaderboardEnabled", "teamsEnabled");
    private static final Set<String> ALLOWED_HOST_SETTINGS_KEYS = Set.of("sessionTemplates", "sessionReviewNotes");
    private static final String AUDIT_ACTION_TENANT_SETTINGS_UPDATED = "TENANT_SETTINGS_UPDATED";
    private static final String AUDIT_ACTION_HOST_SESSION_TEMPLATE_UPSERTED = "HOST_SESSION_TEMPLATE_UPSERTED";
    private static final String AUDIT_ACTION_HOST_SESSION_TEMPLATE_DELETED = "HOST_SESSION_TEMPLATE_DELETED";
    private static final String AUDIT_ACTION_HOST_SESSION_REVIEW_NOTE_UPSERTED = "HOST_SESSION_REVIEW_NOTE_UPSERTED";
    private static final String AUDIT_ACTION_HOST_SESSION_REVIEW_NOTE_DELETED = "HOST_SESSION_REVIEW_NOTE_DELETED";
    private static final String AUDIT_ENTITY_TENANT_SETTINGS = "tenant_settings";
    private static final String AUDIT_ENTITY_HOST_SESSION_TEMPLATE = "host_session_template";
    private static final String AUDIT_ENTITY_HOST_SESSION_REVIEW_NOTE = "host_session_review_note";
    private static final int SETTINGS_SCHEMA_VERSION = 1;
    private static final String DEFAULT_THEME = "classic";
    private static final int DEFAULT_MAX_PLAYERS = RuntimeLimits.MAX_PLAYERS_PER_ROOM;
    private static final int DEFAULT_ROUNDS_PER_MATCH = 10;
    private static final boolean DEFAULT_LEADERBOARD_ENABLED = false;
    private static final boolean DEFAULT_TEAMS_ENABLED = false;

    private final TenantRepository tenantRepository;
    private final TenantBrandingRepository tenantBrandingRepository;
    private final TenantSettingsRepository tenantSettingsRepository;
    private final TenantAuditEventRepository tenantAuditEventRepository;
    private final ObjectMapper objectMapper;
    private final TenantRuntimeSessionCatalogSupport sessionCatalogSupport;

    TenantRuntimeSettingsService(TenantRepository tenantRepository,
                                 TenantBrandingRepository tenantBrandingRepository,
                                 TenantSettingsRepository tenantSettingsRepository,
                                 TenantAuditEventRepository tenantAuditEventRepository,
                                 ObjectMapper objectMapper) {
        this.tenantRepository = tenantRepository;
        this.tenantBrandingRepository = tenantBrandingRepository;
        this.tenantSettingsRepository = tenantSettingsRepository;
        this.tenantAuditEventRepository = tenantAuditEventRepository;
        this.objectMapper = objectMapper;
        this.sessionCatalogSupport = new TenantRuntimeSessionCatalogSupport(objectMapper);
    }

    @Transactional(readOnly = true)
    public TenantSettingsResponse getTenantSettings(UUID tenantId) {
        assertTenantExists(tenantId);
        TenantSettings settings = tenantSettingsRepository.findById(tenantId).orElse(null);
        if (settings == null) {
            return new TenantSettingsResponse(tenantId, defaultSettingsNode(), null);
        }
        return new TenantSettingsResponse(
                tenantId,
                parseSettingsJson(settings.getSettingsJson()),
                settings.getUpdatedAt()
        );
    }

    @Transactional
    public TenantSettingsResponse updateTenantSettings(UUID tenantId,
                                                       UpdateTenantSettingsRequest request,
                                                       UUID actorUserId) {
        assertTenantExists(tenantId);

        JsonNode settingsNode = request == null ? null : request.settings();
        ObjectNode normalizedSettings = normalizeAndValidateSettings(settingsNode);

        Instant now = Instant.now();
        TenantSettings settings = tenantSettingsRepository.findById(tenantId).orElseGet(() -> {
            TenantSettings created = new TenantSettings();
            created.setTenantId(tenantId);
            created.setCreatedAt(now);
            return created;
        });
        settings.setSettingsJson(writeJson(normalizedSettings));
        settings.setUpdatedAt(now);
        tenantSettingsRepository.save(settings);

        tenantRepository.findById(tenantId).ifPresent(tenant -> {
            tenant.setUpdatedAt(now);
            tenantRepository.save(tenant);
        });

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        metadata.put("theme", normalizedSettings.path("theme").asText(DEFAULT_THEME));
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_TENANT_SETTINGS_UPDATED,
                AUDIT_ENTITY_TENANT_SETTINGS,
                tenantId.toString(),
                metadata,
                now,
                actorUserId
        );

        return new TenantSettingsResponse(tenantId, normalizedSettings, settings.getUpdatedAt());
    }

    @Transactional(readOnly = true)
    public TenantBrandingRuntimeResponse getTenantBrandingRuntime(UUID tenantId) {
        if (tenantId == null) {
            throw new IllegalArgumentException("tenant context is required");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new NoSuchElementException("tenant not found"));
        ensureTenantIsActive(tenant);
        TenantBranding branding = tenantBrandingRepository.findById(tenantId).orElseGet(() -> defaultBranding(tenant));

        return new TenantBrandingRuntimeResponse(
                tenantId,
                new TenantBrandingResponse(
                        branding.getAppName(),
                        branding.getLogoUrl(),
                        branding.getPrimaryColor(),
                        branding.getSecondaryColor()
                ),
                branding.getUpdatedAt() == null ? tenant.getUpdatedAt() : branding.getUpdatedAt()
        );
    }

    @Transactional
    public TenantRuntimeSessionTemplatesResponse upsertSessionTemplate(UUID tenantId,
                                                                       String templateId,
                                                                       RuntimeSessionTemplateUpsertRequest request,
                                                                       UUID actorUserId) {
        String normalizedTemplateId = TenantRuntimeSessionCatalogSupport.normalizeTemplateId(templateId);
        Instant now = Instant.now();

        JsonNode currentSettingsNode = getTenantSettings(tenantId).settings();
        if (!(currentSettingsNode instanceof ObjectNode currentSettingsObject)) {
            throw new IllegalStateException("stored tenant settings are invalid");
        }
        ObjectNode nextSettings = currentSettingsObject.deepCopy();
        ObjectNode host = nextSettings.with("host");
        ArrayNode sessionTemplates = objectMapper.createArrayNode();
        ObjectNode normalizedTemplate = sessionCatalogSupport.createSessionTemplateNode(normalizedTemplateId, request, now);
        boolean replaced = false;

        for (RuntimeSessionTemplateResponse existing : sessionCatalogSupport.readSessionTemplates(nextSettings)) {
            if (normalizedTemplateId.equals(existing.templateId())) {
                sessionTemplates.add(normalizedTemplate);
                replaced = true;
                continue;
            }
            sessionTemplates.add(sessionCatalogSupport.toSessionTemplateNode(existing));
        }
        if (!replaced) {
            sessionTemplates.insert(0, normalizedTemplate);
        }
        host.set("sessionTemplates", sessionTemplates);

        TenantSettingsResponse updatedSettings = updateTenantSettings(
                tenantId,
                new UpdateTenantSettingsRequest(nextSettings),
                actorUserId
        );

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("templateId", normalizedTemplateId);
        metadata.put("name", normalizedTemplate.path("name").asText());
        metadata.put("language", normalizedTemplate.path("language").asText("en"));
        metadata.put("topic", normalizedTemplate.path("topic").asText(""));
        metadata.put("playerCount", normalizedTemplate.path("players").size());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_SESSION_TEMPLATE_UPSERTED,
                AUDIT_ENTITY_HOST_SESSION_TEMPLATE,
                normalizedTemplateId,
                metadata,
                now,
                actorUserId
        );

        return new TenantRuntimeSessionTemplatesResponse(
                tenantId,
                sessionCatalogSupport.readSessionTemplates(updatedSettings.settings()),
                updatedSettings.updatedAt()
        );
    }

    @Transactional
    public TenantRuntimeSessionTemplatesResponse deleteSessionTemplate(UUID tenantId,
                                                                       String templateId,
                                                                       UUID actorUserId) {
        String normalizedTemplateId = TenantRuntimeSessionCatalogSupport.normalizeTemplateId(templateId);
        Instant now = Instant.now();

        JsonNode currentSettingsNode = getTenantSettings(tenantId).settings();
        if (!(currentSettingsNode instanceof ObjectNode currentSettingsObject)) {
            throw new IllegalStateException("stored tenant settings are invalid");
        }
        ObjectNode currentSettings = currentSettingsObject.deepCopy();
        ObjectNode host = currentSettings.with("host");
        ArrayNode sessionTemplates = objectMapper.createArrayNode();
        RuntimeSessionTemplateResponse deletedTemplate = null;

        for (RuntimeSessionTemplateResponse existing : sessionCatalogSupport.readSessionTemplates(currentSettings)) {
            if (normalizedTemplateId.equals(existing.templateId())) {
                deletedTemplate = existing;
                continue;
            }
            sessionTemplates.add(sessionCatalogSupport.toSessionTemplateNode(existing));
        }
        if (deletedTemplate == null) {
            throw new NoSuchElementException("session template not found");
        }
        host.set("sessionTemplates", sessionTemplates);

        TenantSettingsResponse updatedSettings = updateTenantSettings(
                tenantId,
                new UpdateTenantSettingsRequest(currentSettings),
                actorUserId
        );

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("templateId", normalizedTemplateId);
        metadata.put("name", deletedTemplate.name());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_SESSION_TEMPLATE_DELETED,
                AUDIT_ENTITY_HOST_SESSION_TEMPLATE,
                normalizedTemplateId,
                metadata,
                now,
                actorUserId
        );

        return new TenantRuntimeSessionTemplatesResponse(
                tenantId,
                sessionCatalogSupport.readSessionTemplates(updatedSettings.settings()),
                updatedSettings.updatedAt()
        );
    }

    @Transactional
    public TenantRuntimeSessionReviewNotesResponse upsertSessionReviewNote(UUID tenantId,
                                                                           String gameId,
                                                                           RuntimeSessionReviewNoteUpsertRequest request,
                                                                           UUID actorUserId) {
        String normalizedGameId = normalizeRequired(gameId, "gameId", 128);
        Instant now = Instant.now();

        JsonNode currentSettingsNode = getTenantSettings(tenantId).settings();
        if (!(currentSettingsNode instanceof ObjectNode currentSettingsObject)) {
            throw new IllegalStateException("stored tenant settings are invalid");
        }
        ObjectNode nextSettings = currentSettingsObject.deepCopy();
        ObjectNode host = nextSettings.with("host");
        ArrayNode sessionReviewNotes = objectMapper.createArrayNode();
        ObjectNode normalizedNote = sessionCatalogSupport.createSessionReviewNoteNode(normalizedGameId, request, now);
        boolean replaced = false;

        for (RuntimeSessionReviewNoteResponse existing : sessionCatalogSupport.readSessionReviewNotes(nextSettings)) {
            if (normalizedGameId.equals(existing.gameId())) {
                sessionReviewNotes.add(normalizedNote);
                replaced = true;
                continue;
            }
            sessionReviewNotes.add(sessionCatalogSupport.toSessionReviewNoteNode(existing));
        }
        if (!replaced) {
            sessionReviewNotes.insert(0, normalizedNote);
        }
        host.set("sessionReviewNotes", sessionReviewNotes);

        TenantSettingsResponse updatedSettings = updateTenantSettings(
                tenantId,
                new UpdateTenantSettingsRequest(nextSettings),
                actorUserId
        );

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("gameId", normalizedGameId);
        metadata.put("noteLength", normalizedNote.path("note").asText().length());
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_SESSION_REVIEW_NOTE_UPSERTED,
                AUDIT_ENTITY_HOST_SESSION_REVIEW_NOTE,
                normalizedGameId,
                metadata,
                now,
                actorUserId
        );

        return new TenantRuntimeSessionReviewNotesResponse(
                tenantId,
                sessionCatalogSupport.readSessionReviewNotes(updatedSettings.settings()),
                updatedSettings.updatedAt()
        );
    }

    @Transactional
    public TenantRuntimeSessionReviewNotesResponse deleteSessionReviewNote(UUID tenantId,
                                                                           String gameId,
                                                                           UUID actorUserId) {
        String normalizedGameId = normalizeRequired(gameId, "gameId", 128);
        Instant now = Instant.now();

        JsonNode currentSettingsNode = getTenantSettings(tenantId).settings();
        if (!(currentSettingsNode instanceof ObjectNode currentSettingsObject)) {
            throw new IllegalStateException("stored tenant settings are invalid");
        }
        ObjectNode currentSettings = currentSettingsObject.deepCopy();
        ObjectNode host = currentSettings.with("host");
        ArrayNode sessionReviewNotes = objectMapper.createArrayNode();
        RuntimeSessionReviewNoteResponse deletedNote = null;

        for (RuntimeSessionReviewNoteResponse existing : sessionCatalogSupport.readSessionReviewNotes(currentSettings)) {
            if (normalizedGameId.equals(existing.gameId())) {
                deletedNote = existing;
                continue;
            }
            sessionReviewNotes.add(sessionCatalogSupport.toSessionReviewNoteNode(existing));
        }
        if (deletedNote == null) {
            throw new NoSuchElementException("session review note not found");
        }
        host.set("sessionReviewNotes", sessionReviewNotes);

        TenantSettingsResponse updatedSettings = updateTenantSettings(
                tenantId,
                new UpdateTenantSettingsRequest(currentSettings),
                actorUserId
        );

        ObjectNode metadata = objectMapper.createObjectNode();
        metadata.put("gameId", normalizedGameId);
        recordAuditEvent(
                tenantId,
                AUDIT_ACTION_HOST_SESSION_REVIEW_NOTE_DELETED,
                AUDIT_ENTITY_HOST_SESSION_REVIEW_NOTE,
                normalizedGameId,
                metadata,
                now,
                actorUserId
        );

        return new TenantRuntimeSessionReviewNotesResponse(
                tenantId,
                sessionCatalogSupport.readSessionReviewNotes(updatedSettings.settings()),
                updatedSettings.updatedAt()
        );
    }

    private void assertTenantExists(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new NoSuchElementException("tenant not found");
        }
    }

    private static void ensureTenantIsActive(Tenant tenant) {
        if (tenant == null || tenant.getStatus() == null || !"active".equals(tenant.getStatus().toLowerCase(Locale.ROOT))) {
            throw new ForbiddenTenantAccessException("tenant is not active");
        }
    }

    private static TenantBranding defaultBranding(Tenant tenant) {
        TenantBranding branding = new TenantBranding();
        branding.setTenantId(tenant.getId());
        branding.setAppName(tenant.getName());
        branding.setPrimaryColor("#1E293B");
        branding.setSecondaryColor("#0EA5E9");
        return branding;
    }

    private JsonNode parseSettingsJson(String settingsJson) {
        if (settingsJson == null || settingsJson.isBlank()) {
            return defaultSettingsNode();
        }
        try {
            JsonNode parsed = objectMapper.readTree(settingsJson);
            return normalizeAndValidateSettings(parsed);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("stored tenant settings are invalid", ex);
        }
    }

    private String writeJson(JsonNode node) {
        try {
            return objectMapper.writeValueAsString(node);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("settings payload is not serializable", ex);
        }
    }

    private void recordAuditEvent(UUID tenantId,
                                  String action,
                                  String entityType,
                                  String entityId,
                                  JsonNode metadata,
                                  Instant eventTime,
                                  UUID actorUserId) {
        TenantAuditEvent event = new TenantAuditEvent();
        event.setId(UUID.randomUUID());
        event.setTenantId(tenantId);
        event.setActorUserId(actorUserId);
        event.setAction(action);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setMetadataJson(writeJson(metadata));
        event.setEventTime(eventTime);
        event.setCreatedAt(eventTime);
        tenantAuditEventRepository.save(event);
    }

    private ObjectNode defaultSettingsNode() {
        ObjectNode game = objectMapper.createObjectNode();
        game.put("maxPlayers", DEFAULT_MAX_PLAYERS);
        game.put("roundsPerMatch", DEFAULT_ROUNDS_PER_MATCH);

        ObjectNode features = objectMapper.createObjectNode();
        features.put("leaderboardEnabled", DEFAULT_LEADERBOARD_ENABLED);
        features.put("teamsEnabled", DEFAULT_TEAMS_ENABLED);

        ObjectNode host = objectMapper.createObjectNode();
        host.set("sessionTemplates", objectMapper.createArrayNode());
        host.set("sessionReviewNotes", objectMapper.createArrayNode());

        ObjectNode root = objectMapper.createObjectNode();
        root.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        root.put("theme", DEFAULT_THEME);
        root.set("game", game);
        root.set("features", features);
        root.set("host", host);
        return root;
    }

    private ObjectNode normalizeAndValidateSettings(JsonNode settingsNode) {
        if (!(settingsNode instanceof ObjectNode root)) {
            throw new IllegalArgumentException("settings must be a JSON object");
        }

        TenantRuntimeSessionCatalogSupport.ensureNoUnknownKeys(root, ALLOWED_SETTINGS_KEYS, "settings");

        int schemaVersion = TenantRuntimeSessionCatalogSupport.readRequiredInt(root, "schemaVersion");
        if (schemaVersion != SETTINGS_SCHEMA_VERSION) {
            throw new IllegalArgumentException("schemaVersion must be " + SETTINGS_SCHEMA_VERSION);
        }

        String theme = TenantRuntimeSessionCatalogSupport.readOptionalTheme(root);

        ObjectNode gameSource = TenantRuntimeSessionCatalogSupport.readOptionalObject(root, "game");
        if (gameSource != null) {
            TenantRuntimeSessionCatalogSupport.ensureNoUnknownKeys(gameSource, ALLOWED_GAME_SETTINGS_KEYS, "settings.game");
        }
        int maxPlayers = TenantRuntimeSessionCatalogSupport.readOptionalInt(gameSource, "maxPlayers", DEFAULT_MAX_PLAYERS, 1, RuntimeLimits.MAX_PLAYERS_PER_ROOM);
        int roundsPerMatch = TenantRuntimeSessionCatalogSupport.readOptionalInt(gameSource, "roundsPerMatch", DEFAULT_ROUNDS_PER_MATCH, 1, 30);

        ObjectNode featuresSource = TenantRuntimeSessionCatalogSupport.readOptionalObject(root, "features");
        if (featuresSource != null) {
            TenantRuntimeSessionCatalogSupport.ensureNoUnknownKeys(featuresSource, ALLOWED_FEATURE_SETTINGS_KEYS, "settings.features");
        }
        boolean leaderboardEnabled = TenantRuntimeSessionCatalogSupport.readOptionalBoolean(featuresSource, "leaderboardEnabled", DEFAULT_LEADERBOARD_ENABLED);
        boolean teamsEnabled = TenantRuntimeSessionCatalogSupport.readOptionalBoolean(featuresSource, "teamsEnabled", DEFAULT_TEAMS_ENABLED);

        ObjectNode hostSource = TenantRuntimeSessionCatalogSupport.readOptionalObject(root, "host");
        if (hostSource != null) {
            TenantRuntimeSessionCatalogSupport.ensureNoUnknownKeys(hostSource, ALLOWED_HOST_SETTINGS_KEYS, "settings.host");
        }
        ArrayNode normalizedSessionTemplates = sessionCatalogSupport.normalizeSessionTemplates(hostSource == null ? null : hostSource.get("sessionTemplates"));
        ArrayNode normalizedSessionReviewNotes = sessionCatalogSupport.normalizeSessionReviewNotes(hostSource == null ? null : hostSource.get("sessionReviewNotes"));

        ObjectNode normalizedGame = objectMapper.createObjectNode();
        normalizedGame.put("maxPlayers", maxPlayers);
        normalizedGame.put("roundsPerMatch", roundsPerMatch);

        ObjectNode normalizedFeatures = objectMapper.createObjectNode();
        normalizedFeatures.put("leaderboardEnabled", leaderboardEnabled);
        normalizedFeatures.put("teamsEnabled", teamsEnabled);

        ObjectNode normalizedHost = objectMapper.createObjectNode();
        normalizedHost.set("sessionTemplates", normalizedSessionTemplates);
        normalizedHost.set("sessionReviewNotes", normalizedSessionReviewNotes);

        ObjectNode normalizedRoot = objectMapper.createObjectNode();
        normalizedRoot.put("schemaVersion", SETTINGS_SCHEMA_VERSION);
        normalizedRoot.put("theme", theme);
        normalizedRoot.set("game", normalizedGame);
        normalizedRoot.set("features", normalizedFeatures);
        normalizedRoot.set("host", normalizedHost);
        return normalizedRoot;
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
