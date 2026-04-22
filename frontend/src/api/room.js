import { API_BASE, ApiError, USE_SAMPLE_MODE, fetchJson, normalizeRequiredField, requireApiBase } from './core';
import { resolveRuntimeAuthHeaders } from './runtime';

function normalizeRequiredRoomCode(roomCode) {
  const normalized = String(roomCode || '').trim().toUpperCase();
  if (!normalized) {
    throw new ApiError('roomCode is required', 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

function requireRoomApi() {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Room API is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
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

export async function createRoomSession({ displayName } = {}) {
  requireRoomApi();
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
  requireRoomApi();
  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}`);
}

export async function joinRoomSession(roomCode, { displayName } = {}) {
  requireRoomApi();
  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const normalizedDisplayName = String(displayName || '').trim();
  const payload = normalizedDisplayName ? { displayName: normalizedDisplayName } : {};
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}/join`, {
    method: 'POST',
    body: payload
  });
}

export async function rejoinRoomSession(roomCode, input = {}) {
  requireRoomApi();
  const normalizedRoomCode = normalizeRequiredRoomCode(roomCode);
  const payload = buildRoomRejoinPayload(input);
  return fetchJson(`${API_BASE}/api/rooms/${encodeURIComponent(normalizedRoomCode)}/rejoin`, {
    method: 'POST',
    body: payload
  });
}

export async function removeRoomPlayerFromSession(roomCode, input = {}) {
  requireRoomApi();
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

export function resolveRoomSessionErrorMessage(error, { action = 'join' } = {}) {
  const normalizedAction = String(action || 'join').trim().toLowerCase();
  const waitingLabel = normalizedAction === 'resume'
    ? 'restore the room session'
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
