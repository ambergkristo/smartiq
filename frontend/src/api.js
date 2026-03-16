export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const SAMPLE_MODE_FLAG = String(import.meta.env.VITE_SAMPLE_MODE || import.meta.env.VITE_USE_SAMPLE || '').toLowerCase() === 'true';
export const USE_SAMPLE_MODE = Boolean(import.meta.env.DEV) && SAMPLE_MODE_FLAG;
const RUNTIME_AUTH_STORAGE_KEY = 'smartiq.runtimeAuth';

class ApiError extends Error {
  constructor(message, status, code, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const SAMPLE_TOPICS = [
  { topic: 'Science', count: 120 },
  { topic: 'History', count: 120 },
  { topic: 'Math', count: 120 }
];

function sampleCard({ topic, language }) {
  const normalizedTopic = topic || 'Science';
  const normalizedLanguage = normalizeLanguage(language);
  return {
    id: `sample-${normalizedTopic.toLowerCase()}`,
    cardId: `sample-${normalizedTopic.toLowerCase()}`,
    topic: normalizedTopic,
    subtopic: 'SAMPLE',
    language: normalizedLanguage,
    question: `${normalizedTopic} sample question (${normalizedLanguage.toUpperCase()})`,
    options: Array.from({ length: 8 }, (_, index) => `${normalizedTopic} option ${index + 1}`),
    category: 'OPEN',
    correct: { correctIndex: 0 },
    difficulty: '1',
    source: 'sample-mode',
    createdAt: new Date().toISOString()
  };
}

function normalizeCardPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const options = Array.isArray(raw.options)
    ? raw.options.map((entry) => (entry && typeof entry === 'object' && 'text' in entry ? entry.text : String(entry)))
    : Array.isArray(raw.answers)
      ? raw.answers.map((entry) => String(entry))
      : [];

  let correct = raw.correct;
  if (!correct || typeof correct !== 'object') {
    if (Array.isArray(raw.correctIndexes)) {
      correct = { correctIndexes: raw.correctIndexes };
    } else if (Number.isInteger(raw.correctIndex)) {
      correct = { correctIndex: raw.correctIndex };
    } else {
      correct = {};
    }
  }

  return {
    ...raw,
    id: raw.id || raw.cardId,
    cardId: raw.cardId || raw.id,
    questionText: raw.questionText || raw.question || '',
    category: raw.category || raw.subtopic || 'OPEN',
    options,
    answers: options,
    correctAnswerIndex: Number.isInteger(raw.correctAnswerIndex)
      ? raw.correctAnswerIndex
      : Number.isInteger(correct?.correctIndex)
        ? correct.correctIndex
        : null,
    correct
  };
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const TOPICS_WARMUP_DELAYS_MS = [5000, 10000, 20000];

function isBackendWarmupCandidate(error) {
  return error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR';
}

async function fetchJson(url, {
  timeoutMs = 8000,
  method = 'GET',
  body = null,
  headers = null
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
      method,
      signal: controller.signal
    };
    if (headers && typeof headers === 'object') {
      options.headers = { ...headers };
    }
    if (body !== null) {
      options.headers = {
        ...(options.headers || {}),
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      let detail = null;
      let backendCode = null;
      try {
        const payload = await res.json();
        if (payload && typeof payload.error === 'string') {
          detail = payload.error;
        }
        if (payload && typeof payload.code === 'string' && payload.code.trim().length > 0) {
          backendCode = payload.code.trim();
        }
      } catch {
        detail = null;
      }
      throw new ApiError(`Request failed: ${res.status}`, res.status, backendCode || 'HTTP_ERROR', detail);
    }
    return res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 0, 'TIMEOUT');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network request failed', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

function requireApiBase() {
  if (!API_BASE && !USE_SAMPLE_MODE) {
    throw new ApiError(
      'Missing VITE_API_BASE_URL. Configure frontend env before starting game.',
      0,
      'CONFIG_ERROR'
    );
  }
}

function normalizeBearerHeader(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) {
    return null;
  }
  if (/^bearer\s+/i.test(token)) {
    return token;
  }
  return `Bearer ${token}`;
}

function readStoredRuntimeAuthContext() {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(RUNTIME_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const userEmail = String(parsed.userEmail || '').trim();
    const tenantId = String(parsed.tenantId || '').trim();
    const bearerToken = normalizeBearerHeader(parsed.bearerToken);
    if (!userEmail || !tenantId) {
      return null;
    }
    return {
      userEmail,
      tenantId,
      bearerToken
    };
  } catch {
    return null;
  }
}

function normalizeRuntimeAuthContext(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const userEmail = String(input.userEmail || '').trim();
  const tenantId = String(input.tenantId || '').trim();
  const bearerToken = normalizeBearerHeader(input.bearerToken);
  if (!userEmail || !tenantId) {
    return null;
  }
  return {
    userEmail,
    tenantId,
    bearerToken
  };
}

export function getRuntimeAuthContext() {
  return readStoredRuntimeAuthContext();
}

export function setRuntimeAuthContext(input) {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const normalized = normalizeRuntimeAuthContext(input);
  if (!normalized) {
    localStorage.removeItem(RUNTIME_AUTH_STORAGE_KEY);
    return null;
  }
  localStorage.setItem(RUNTIME_AUTH_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearRuntimeAuthContext() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(RUNTIME_AUTH_STORAGE_KEY);
}

export async function requestRuntimeAuthLink({ email, tenantId } = {}) {
  requireApiBase();
  const normalizedEmail = normalizeRequiredField(email, 'email').toLowerCase();
  const payload = { email: normalizedEmail };
  const normalizedTenantId = String(tenantId || '').trim();
  if (normalizedTenantId) {
    payload.tenantId = normalizedTenantId;
  }
  return fetchJson(`${API_BASE}/api/auth/request-link`, {
    method: 'POST',
    body: payload
  });
}

export async function completeRuntimeAuth({ challengeToken } = {}) {
  requireApiBase();
  const normalizedChallengeToken = normalizeRequiredField(challengeToken, 'challengeToken');
  return fetchJson(`${API_BASE}/api/auth/complete`, {
    method: 'POST',
    body: { challengeToken: normalizedChallengeToken }
  });
}

export async function logoutRuntimeAuth() {
  requireApiBase();
  return fetchJson(`${API_BASE}/api/auth/logout`, {
    method: 'POST'
  });
}

function resolveRuntimeAuthHeaders() {
  const envBearer = normalizeBearerHeader(
    import.meta.env.VITE_RUNTIME_AUTH_BEARER_TOKEN
    || import.meta.env.VITE_RUNTIME_AUTH_TOKEN
    || import.meta.env.VITE_AUTH_BEARER_TOKEN
  );
  const envUserEmail = String(
    import.meta.env.VITE_RUNTIME_USER_EMAIL
    || import.meta.env.VITE_AUTH_USER_EMAIL
    || ''
  ).trim();
  const envTenantId = String(
    import.meta.env.VITE_RUNTIME_TENANT_ID
    || import.meta.env.VITE_AUTH_TENANT_ID
    || ''
  ).trim();
  const storedContext = readStoredRuntimeAuthContext();
  const bearer = envBearer || storedContext?.bearerToken || null;
  const userEmail = envUserEmail || storedContext?.userEmail || '';
  const tenantId = envTenantId || storedContext?.tenantId || '';

  const headers = {};
  if (bearer) {
    headers.Authorization = bearer;
  }
  if (userEmail && tenantId) {
    headers['X-SmartIQ-User-Email'] = userEmail;
    headers['X-SmartIQ-Tenant-Id'] = tenantId;
  }
  return headers;
}

export function hasRuntimeAuthContext() {
  return Object.keys(resolveRuntimeAuthHeaders()).length > 0;
}

export async function fetchTenantRuntimeSnapshot() {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    return null;
  }

  const me = await fetchJson(`${API_BASE}/api/me`, { headers });
  const [settings, branding, subscription, capabilities] = await Promise.all([
    fetchJson(`${API_BASE}/api/me/tenant-settings`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-branding`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-subscription`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-capabilities`, { headers })
  ]);

  return {
    me,
    settings,
    branding,
    subscription,
    capabilities
  };
}

export async function updateRuntimeTenantBranding({ appName, logoUrl, primaryColor, secondaryColor } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for tenant branding updates.', 0, 'UNAUTHENTICATED');
  }

  return fetchJson(`${API_BASE}/api/me/tenant-branding`, {
    method: 'PATCH',
    headers,
    body: {
      appName: normalizeRequiredField(appName, 'appName'),
      logoUrl: String(logoUrl || '').trim() || null,
      primaryColor: normalizeRequiredField(primaryColor, 'primaryColor'),
      secondaryColor: normalizeRequiredField(secondaryColor, 'secondaryColor')
    }
  });
}

export async function upsertRuntimeSessionTemplate(templateId, { name, topic, language, theme, players } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for session templates.', 0, 'UNAUTHENTICATED');
  }
  const normalizedTemplateId = normalizeRequiredField(templateId, 'templateId');
  const normalizedPlayers = Array.isArray(players)
    ? players.map((player) => String(player || '').trim()).filter(Boolean)
    : [];
  if (normalizedPlayers.length === 0) {
    throw new ApiError('players is required', 0, 'VALIDATION_ERROR');
  }

  return fetchJson(`${API_BASE}/api/me/session-templates/${encodeURIComponent(normalizedTemplateId)}`, {
    method: 'PUT',
    headers,
    body: {
      name: normalizeRequiredField(name, 'name'),
      topic: String(topic || '').trim() || null,
      language: normalizeRequiredField(language, 'language').toLowerCase(),
      theme: normalizeRequiredField(theme, 'theme').toLowerCase(),
      players: normalizedPlayers
    }
  });
}

export async function deleteRuntimeSessionTemplate(templateId) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for session templates.', 0, 'UNAUTHENTICATED');
  }
  const normalizedTemplateId = normalizeRequiredField(templateId, 'templateId');
  return fetchJson(`${API_BASE}/api/me/session-templates/${encodeURIComponent(normalizedTemplateId)}`, {
    method: 'DELETE',
    headers
  });
}

export async function upsertRuntimeSessionReviewNote(gameId, { note } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for session review notes.', 0, 'UNAUTHENTICATED');
  }
  const normalizedGameId = normalizeRequiredField(gameId, 'gameId');
  return fetchJson(`${API_BASE}/api/me/session-review-notes/${encodeURIComponent(normalizedGameId)}`, {
    method: 'PUT',
    headers,
    body: {
      note: normalizeRequiredField(note, 'note')
    }
  });
}

export async function deleteRuntimeSessionReviewNote(gameId) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for session review notes.', 0, 'UNAUTHENTICATED');
  }
  const normalizedGameId = normalizeRequiredField(gameId, 'gameId');
  return fetchJson(`${API_BASE}/api/me/session-review-notes/${encodeURIComponent(normalizedGameId)}`, {
    method: 'DELETE',
    headers
  });
}

export async function fetchTenantCapabilities() {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for tenant capabilities.', 0, 'UNAUTHENTICATED');
  }
  return fetchJson(`${API_BASE}/api/me/tenant-capabilities`, { headers });
}

export async function fetchTenantAuditEvents({ limit } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for tenant audit events.', 0, 'UNAUTHENTICATED');
  }

  const url = new URL(`${API_BASE}/api/me/tenant-audit-events`);
  if (Number.isInteger(limit) && limit > 0) {
    url.searchParams.set('limit', String(limit));
  }
  return fetchJson(url.toString(), { headers });
}

export async function fetchTenantUsageSummary({ eventType, from, to } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for tenant usage summary.', 0, 'UNAUTHENTICATED');
  }

  const url = new URL(`${API_BASE}/api/me/tenant-usage-summary`);
  if (String(eventType || '').trim()) {
    url.searchParams.set('eventType', String(eventType).trim());
  }
  if (String(from || '').trim()) {
    url.searchParams.set('from', String(from).trim());
  }
  if (String(to || '').trim()) {
    url.searchParams.set('to', String(to).trim());
  }
  return fetchJson(url.toString(), { headers });
}

function normalizeRequiredField(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new ApiError(`${fieldName} is required`, 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

export async function bootstrapOnboardingTenant({ workspaceName, ownerEmail, ownerDisplayName } = {}) {
  requireApiBase();
  const normalizedWorkspaceName = normalizeRequiredField(workspaceName, 'workspaceName');
  const normalizedOwnerEmail = normalizeRequiredField(ownerEmail, 'ownerEmail').toLowerCase();
  if (!normalizedOwnerEmail.includes('@') || normalizedOwnerEmail.startsWith('@') || normalizedOwnerEmail.endsWith('@')) {
    throw new ApiError('ownerEmail must be a valid address', 0, 'VALIDATION_ERROR');
  }
  const normalizedOwnerDisplayName = String(ownerDisplayName || '').trim();

  const payload = {
    workspaceName: normalizedWorkspaceName,
    ownerEmail: normalizedOwnerEmail
  };
  if (normalizedOwnerDisplayName) {
    payload.ownerDisplayName = normalizedOwnerDisplayName;
  }

  return fetchJson(`${API_BASE}/api/onboarding/bootstrap`, {
    method: 'POST',
    body: payload
  });
}

export async function initiateCheckoutSession({ planCode, billingCycle } = {}) {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError('Runtime auth context is required for checkout.', 0, 'UNAUTHENTICATED');
  }
  const normalizedPlanCode = normalizeRequiredField(planCode, 'planCode').toLowerCase();
  const normalizedBillingCycle = normalizeRequiredField(billingCycle, 'billingCycle').toLowerCase();

  return fetchJson(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers,
    body: {
      planCode: normalizedPlanCode,
      billingCycle: normalizedBillingCycle
    }
  });
}

function normalizeLanguage(lang) {
  const etEnabled = String(import.meta.env.VITE_ENABLE_ET || '').toLowerCase() === 'true';
  const value = String(lang ?? '').trim().toLowerCase();
  if (value === 'et' && etEnabled) {
    return 'et';
  }
  return 'en';
}

export function buildServerGamePayload({ players, language, topic, winCondition } = {}) {
  const payload = {};

  if (Array.isArray(players)) {
    const normalizedPlayers = players
      .map((player) => String(player || '').trim())
      .filter(Boolean);
    if (normalizedPlayers.length > 0) {
      payload.players = normalizedPlayers;
    }
  }

  payload.language = normalizeLanguage(language);

  if (topic && String(topic).trim().length > 0) {
    payload.topic = String(topic).trim();
  }

  if (Number.isInteger(winCondition) && winCondition > 0) {
    payload.winCondition = winCondition;
  }

  return payload;
}

export function buildServerActionPayload({ type, tileIndex, actorPlayerId, actionToken, actionRequestId } = {}) {
  const actionType = String(type || '').trim().toUpperCase();
  if (!actionType) {
    throw new ApiError('Action type is required', 0, 'VALIDATION_ERROR');
  }
  if (actionType !== 'ANSWER' && actionType !== 'ADVANCE') {
    throw new ApiError(`Unsupported action type: ${actionType}`, 0, 'VALIDATION_ERROR');
  }

  const normalizedActorPlayerId = String(actorPlayerId || '').trim();
  if (!normalizedActorPlayerId) {
    throw new ApiError('actorPlayerId is required', 0, 'VALIDATION_ERROR');
  }
  const normalizedActionToken = String(actionToken || '').trim();
  if (!normalizedActionToken) {
    throw new ApiError('actionToken is required', 0, 'VALIDATION_ERROR');
  }
  const normalizedActionRequestId = String(actionRequestId || '').trim();
  if (!normalizedActionRequestId) {
    throw new ApiError('actionRequestId is required', 0, 'VALIDATION_ERROR');
  }

  const payload = {
    type: actionType,
    actorPlayerId: normalizedActorPlayerId,
    actionToken: normalizedActionToken,
    actionRequestId: normalizedActionRequestId
  };
  if (actionType === 'ANSWER') {
    if (!Number.isInteger(tileIndex)) {
      throw new ApiError('tileIndex is required for ANSWER', 0, 'VALIDATION_ERROR');
    }
    payload.tileIndex = tileIndex;
  }

  return payload;
}

async function fetchBackendHealth() {
  return fetchJson(`${API_BASE}/health`);
}

export async function fetchTopics({ onWarmupChange } = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return SAMPLE_TOPICS;
  }

  const topicsUrl = `${API_BASE}/api/topics`;

  try {
    return await fetchJson(topicsUrl);
  } catch (error) {
    if (!isBackendWarmupCandidate(error)) {
      throw error;
    }

    let lastError = error;
    for (let attempt = 0; attempt < TOPICS_WARMUP_DELAYS_MS.length; attempt += 1) {
      const delayMs = TOPICS_WARMUP_DELAYS_MS[attempt];
      onWarmupChange?.({
        attempt: attempt + 1,
        totalAttempts: TOPICS_WARMUP_DELAYS_MS.length,
        nextDelayMs: delayMs
      });

      try {
        await fetchBackendHealth();
        return await fetchJson(topicsUrl);
      } catch (retryError) {
        lastError = retryError;
        if (!isBackendWarmupCandidate(retryError)) {
          throw retryError;
        }
        if (attempt < TOPICS_WARMUP_DELAYS_MS.length - 1) {
          await delay(delayMs);
        }
      }
    }

    throw new ApiError(
      lastError?.message || 'Backend unavailable after warm-up retries',
      0,
      'WARMUP_FAILED'
    );
  }
}

export function resolveTopicsErrorState(error) {
  if (error?.code === 'CONTENT_UNHEALTHY') {
    return {
      title: 'CherryPick content failed to load. Please check runtime dataset configuration.',
      detail: typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : 'Backend reported missing or broken CherryPick runtime content.',
      kind: 'content-unhealthy'
    };
  }

  if (error?.code === 'WARMUP_FAILED') {
    return {
      title: 'Backend unavailable.',
      detail: 'Backend did not wake up after multiple attempts. Retry in a moment.',
      kind: 'backend-unreachable'
    };
  }

  if (error?.code === 'TIMEOUT') {
    return {
      title: 'Backend request timed out.',
      detail: 'Check if backend is running, then retry.',
      kind: 'backend-unreachable'
    };
  }

  if (error?.code === 'NETWORK_ERROR') {
    return {
      title: 'Backend is unreachable.',
      detail: 'Verify backend URL and that the API server is running.',
      kind: 'backend-unreachable'
    };
  }

  if (error?.code === 'CONFIG_ERROR') {
    return {
      title: 'Frontend API is not configured.',
      detail: 'Set VITE_API_BASE_URL (example: http://localhost:8081).',
      kind: 'config-error'
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      title: 'Forbidden (CORS/security).',
      detail: 'Check dev env / CORS origins.',
      kind: 'forbidden'
    };
  }

  if (error?.status === 404) {
    return {
      title: 'Not found.',
      detail: 'Topics endpoint is missing or routed incorrectly.',
      kind: 'not-found'
    };
  }

  if (error?.status >= 500) {
    return {
      title: 'Server error.',
      detail: 'Backend responded with a server error. Retry in a moment.',
      kind: 'server-error'
    };
  }

  return {
    title: 'Could not load topics.',
    detail: 'Unexpected response. Retry and inspect backend logs.',
    kind: 'backend-unreachable'
  };
}

function isRetryable(error) {
  if (!(error instanceof ApiError)) {
    return true;
  }
  if (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') {
    return true;
  }
  return error.status >= 500;
}

export async function fetchNextCard({ topic, gameId, language, retries = 2 }) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return normalizeCardPayload(sampleCard({
      topic,
      language: normalizeLanguage(language)
    }));
  }

  const resolvedGameId = String(gameId || '').trim() || 'local-dev';
  const params = new URLSearchParams();
  params.set('language', normalizeLanguage(language));
  params.set('gameId', resolvedGameId);
  if (topic) {
    params.set('topic', String(topic));
  }
  const url = `${API_BASE}/api/cards/nextRandom?${params.toString()}`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const card = await fetchJson(url);
      return normalizeCardPayload(card);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === retries) {
        throw error;
      }
      await delay(250 * (attempt + 1));
    }
  }

  throw lastError;
}

function normalizeRequiredGameId(gameId) {
  const normalized = String(gameId || '').trim();
  if (!normalized) {
    throw new ApiError('gameId is required', 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

function normalizeRequiredRoomCode(roomCode) {
  const normalized = String(roomCode || '').trim().toUpperCase();
  if (!normalized) {
    throw new ApiError('roomCode is required', 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

export function buildRoomRejoinPayload({ playerId, authToken } = {}) {
  const normalizedPlayerId = String(playerId || '').trim();
  if (!normalizedPlayerId) {
    throw new ApiError('playerId is required', 0, 'VALIDATION_ERROR');
  }

  const normalizedAuthToken = String(authToken || '').trim();
  if (!normalizedAuthToken) {
    throw new ApiError('authToken is required', 0, 'VALIDATION_ERROR');
  }

  return {
    playerId: normalizedPlayerId,
    authToken: normalizedAuthToken
  };
}

export function buildRoomPlayerRemovalPayload({ hostPlayerId, hostAuthToken, targetPlayerId } = {}) {
  return {
    hostPlayerId: normalizeRequiredField(hostPlayerId, 'hostPlayerId'),
    hostAuthToken: normalizeRequiredField(hostAuthToken, 'hostAuthToken'),
    targetPlayerId: normalizeRequiredField(targetPlayerId, 'targetPlayerId')
  };
}

export async function createServerGameSession(input = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const payload = buildServerGamePayload(input);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game`, { method: 'POST', headers, body: payload });
}

export async function fetchServerGameSession(gameId) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}`, {
    headers: resolveRuntimeAuthHeaders()
  });
}

export async function duplicateServerGameSession(gameId) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/duplicate`, {
    method: 'POST',
    headers
  });
}

export async function resumeServerGameSession(gameId) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/resume`, {
    method: 'POST',
    headers
  });
}

export async function sendServerGameAction(gameId, action) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const payload = buildServerActionPayload(action);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/action`, {
    method: 'POST',
    headers,
    body: payload
  });
}

export async function createRoomSession({ displayName } = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }

  const normalizedDisplayName = String(displayName || '').trim();
  const payload = normalizedDisplayName ? { displayName: normalizedDisplayName } : {};
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/rooms`, {
    method: 'POST',
    headers,
    body: payload
  });
}

export async function fetchRoomPreview(roomCode) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }

  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}`);
}

export async function joinRoomSession(roomCode, { displayName } = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }

  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const normalizedDisplayName = String(displayName || '').trim();
  const payload = normalizedDisplayName ? { displayName: normalizedDisplayName } : {};
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}/join`, {
    method: 'POST',
    body: payload
  });
}

export async function rejoinRoomSession(roomCode, input = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }

  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const payload = buildRoomRejoinPayload(input);
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}/rejoin`, {
    method: 'POST',
    body: payload
  });
}

export async function removeRoomPlayerFromSession(roomCode, input = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }

  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const payload = buildRoomPlayerRemovalPayload(input);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}/remove-player`, {
    method: 'POST',
    headers,
    body: payload
  });
}

export function buildRoomWebSocketUrl({ roomCode, playerId, authToken } = {}) {
  requireApiBase();
  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const payload = buildRoomRejoinPayload({ playerId, authToken });
  const baseUrl = new URL(API_BASE);
  const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${baseUrl.host}/ws/rooms/${encodeURIComponent(normalizedRoomCode)}`
    + `?playerId=${encodeURIComponent(payload.playerId)}&authToken=${encodeURIComponent(payload.authToken)}`;
}

export function resolveCardErrorMessage(error) {
  if (error?.code === 'CONFIG_ERROR') {
    return 'Frontend API is not configured. Set VITE_API_BASE_URL and retry.';
  }

  if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
    return 'Backend unreachable. Check API availability and retry.';
  }

  if (error?.status === 401 || error?.status === 403) {
    return 'Forbidden (CORS/security). Check dev env / CORS origins.';
  }

  if (error?.status === 404) {
    if (typeof error?.detail === 'string' && error.detail.trim().length > 0) {
      if (/^No cards available for language=/i.test(error.detail.trim())) {
        return `No playable cards for this filter. ${error.detail}. Change topic/language or import cards.`;
      }
      return `Not found. ${error.detail}`;
    }
    return 'Not found. Question bank is empty for this filter.';
  }

  if (error?.status === 409) {
    return 'Conflict (slot/card unavailable). Please retry.';
  }

  if (error?.status >= 500) {
    return 'Server error. Retry to continue.';
  }

  return 'Could not load card from backend. Retry to continue.';
}

export function resolveGameSessionErrorMessage(error) {
  if (error?.code === 'CONFIG_ERROR') {
    return 'Frontend API is not configured. Set VITE_API_BASE_URL and retry.';
  }

  if (error?.code === 'CONTRACT_MISMATCH') {
    return error.message || 'Game session contract mismatch. Refresh client and backend.';
  }

  if (error?.code === 'INVALID_ACTION') {
    return typeof error?.detail === 'string' && error.detail.trim().length > 0
      ? `Invalid game action. ${error.detail}`
      : 'Invalid game action payload.';
  }

  if (error?.code === 'FORBIDDEN_ACTOR') {
    return typeof error?.detail === 'string' && error.detail.trim().length > 0
      ? `Forbidden game action. ${error.detail}`
      : 'Forbidden game action.';
  }

  if (error?.code === 'FORBIDDEN_TENANT_ACCESS') {
    return typeof error?.detail === 'string' && error.detail.trim().length > 0
      ? `Hosted runtime unavailable. ${error.detail}`
      : 'Hosted runtime is unavailable for this tenant.';
  }

  if (error?.code === 'DUPLICATE_ACTION') {
    return typeof error?.detail === 'string' && error.detail.trim().length > 0
      ? `Duplicate game action. ${error.detail}`
      : 'Duplicate game action.';
  }

  if (error?.code === 'GAME_NOT_FOUND') {
    return 'Game session was not found. Start a new game.';
  }

  if (error?.code === 'RATE_LIMITED') {
    return typeof error?.detail === 'string' && error.detail.trim().length > 0
      ? `Rate limited. ${error.detail}`
      : 'Rate limited. Retry shortly.';
  }

  if (error?.code === 'INTERNAL_ERROR') {
    return 'Server error while processing game action. Retry.';
  }

  if (error?.code === 'VALIDATION_ERROR') {
    return error.message || 'Invalid game action payload.';
  }

  if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
    return 'Backend unreachable. Check API availability and retry.';
  }

  if (error?.status === 404) {
    return 'Game session was not found. Start a new game.';
  }

  if (error?.status === 400) {
    if (typeof error?.detail === 'string' && error.detail.trim().length > 0) {
      return `Invalid game action. ${error.detail}`;
    }
    return 'Invalid game action payload.';
  }

  if (error?.status === 403) {
    if (typeof error?.detail === 'string' && error.detail.trim().length > 0) {
      return `Forbidden game action. ${error.detail}`;
    }
    return 'Forbidden game action.';
  }

  if (error?.status === 409) {
    if (typeof error?.detail === 'string' && error.detail.trim().length > 0) {
      return `Duplicate game action. ${error.detail}`;
    }
    return 'Duplicate game action.';
  }

  if (error?.status >= 500) {
    return 'Server error while processing game action. Retry.';
  }

  return 'Could not process game action. Retry.';
}

export function resolveRoomSessionErrorMessage(error, { action = 'join' } = {}) {
  const normalizedAction = String(action || 'join').trim().toLowerCase();
  const waitingLabel = normalizedAction === 'resume'
    ? 'restore the joined game'
    : normalizedAction === 'create'
      ? 'create the host room'
      : 'join this game';

  if (error?.code === 'CONFIG_ERROR') {
    return 'Frontend API is not configured. Set VITE_API_BASE_URL and retry.';
  }

  if (error?.code === 'VALIDATION_ERROR') {
    const message = String(error?.message || '').trim().toLowerCase();
    if (message.includes('roomcode')) {
      return 'Enter a valid game code.';
    }
    if (message.includes('displayname')) {
      return normalizedAction === 'create' ? 'Enter a host name.' : 'Enter your display name.';
    }
    return `Could not ${waitingLabel}. Check the code and player name.`;
  }

  if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
    return 'CherryPick could not reach the live game service. Retry in a moment.';
  }

  if (error?.code === 'ROOM_NOT_FOUND' || error?.status === 404) {
    return 'Game code not found. Check the code and try again.';
  }

  if (error?.code === 'ROOM_CLOSED') {
    return 'This game is no longer open for joining.';
  }

  if (error?.status === 400) {
    if (typeof error?.detail === 'string' && /display.?name/i.test(error.detail)) {
      return 'Enter a valid display name.';
    }
    return `Could not ${waitingLabel}. Check the code and player name.`;
  }

  if (error?.status === 409) {
    return normalizedAction === 'create'
      ? 'Could not create a host room right now.'
      : 'This game is not open for joining right now.';
  }

  if (error?.status >= 500) {
    return 'Live game service error. Retry in a moment.';
  }

  return `Could not ${waitingLabel}. Retry in a moment.`;
}
