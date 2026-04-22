import { API_BASE, ApiError, USE_SAMPLE_MODE, fetchJson, normalizeLanguage, normalizeRequiredField, requireApiBase } from './core';
import { resolveRuntimeAuthHeaders } from './runtime';

export function buildServerGamePayload({ players, language, topic, winCondition, roomCode, roomPlayerId, roomAuthToken } = {}) {
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

  const normalizedRoomCode = String(roomCode || '').trim().toUpperCase();
  if (normalizedRoomCode) {
    payload.roomCode = normalizedRoomCode;
    payload.roomPlayerId = normalizeRequiredField(roomPlayerId, 'roomPlayerId');
    payload.roomAuthToken = normalizeRequiredField(roomAuthToken, 'roomAuthToken');
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

function normalizeRequiredGameId(gameId) {
  const normalized = String(gameId || '').trim();
  if (!normalized) {
    throw new ApiError('gameId is required', 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

function requireServerGameApi() {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Server game session API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
}

export async function createServerGameSession(input = {}) {
  requireServerGameApi();
  const payload = buildServerGamePayload(input);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game`, { method: 'POST', headers, body: payload });
}

export async function fetchServerGameSession(gameId) {
  requireServerGameApi();
  const normalizedGameId = normalizeRequiredGameId(gameId);
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}`, {
    headers: resolveRuntimeAuthHeaders()
  });
}

export async function duplicateServerGameSession(gameId) {
  requireServerGameApi();
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/duplicate`, {
    method: 'POST',
    headers
  });
}

export async function resumeServerGameSession(gameId) {
  requireServerGameApi();
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/resume`, {
    method: 'POST',
    headers
  });
}

export async function sendServerGameAction(gameId, action) {
  requireServerGameApi();
  const normalizedGameId = normalizeRequiredGameId(gameId);
  const payload = buildServerActionPayload(action);
  const headers = resolveRuntimeAuthHeaders();
  return fetchJson(`${API_BASE}/api/game/${encodeURIComponent(normalizedGameId)}/action`, {
    method: 'POST',
    headers,
    body: payload
  });
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
