export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const SAMPLE_MODE_FLAG = String(import.meta.env.VITE_SAMPLE_MODE || import.meta.env.VITE_USE_SAMPLE || '').toLowerCase() === 'true';
export const USE_SAMPLE_MODE = Boolean(import.meta.env.DEV) && SAMPLE_MODE_FLAG;

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
    options: Array.from({ length: 10 }, (_, index) => `${normalizedTopic} option ${index + 1}`),
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
    category: raw.category || raw.subtopic || 'OPEN',
    options,
    correct
  };
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(url, { timeoutMs = 8000, method = 'GET', body = null } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
      method,
      signal: controller.signal
    };
    if (body !== null) {
      options.headers = {
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      let detail = null;
      try {
        const payload = await res.json();
        if (payload && typeof payload.error === 'string') {
          detail = payload.error;
        }
      } catch {
        detail = null;
      }
      throw new ApiError(`Request failed: ${res.status}`, res.status, 'HTTP_ERROR', detail);
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

export function buildServerActionPayload({ type, tileIndex, rank, actorPlayerId, actionToken, actionRequestId } = {}) {
  const actionType = String(type || '').trim().toUpperCase();
  if (!actionType) {
    throw new ApiError('Action type is required', 0, 'VALIDATION_ERROR');
  }
  if (actionType !== 'ANSWER' && actionType !== 'PASS') {
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
    if (Number.isInteger(rank)) {
      payload.rank = rank;
    }
  }

  return payload;
}

export async function fetchTopics() {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return SAMPLE_TOPICS;
  }
  return fetchJson(`${API_BASE}/api/topics`);
}

export function resolveTopicsErrorState(error) {
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

export async function createServerGameSession(input = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const payload = buildServerGamePayload(input);
  return fetchJson(`${API_BASE}/api/game`, { method: 'POST', body: payload });
}

export async function fetchServerGameSession(gameId) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}`);
}

export async function sendServerGameAction(gameId, action) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const payload = buildServerActionPayload(action);
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/action`, {
    method: 'POST',
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
  return fetchJson(`${API_BASE}/api/rooms`, {
    method: 'POST',
    body: payload
  });
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
