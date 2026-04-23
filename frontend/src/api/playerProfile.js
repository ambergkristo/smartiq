import { API_BASE, ApiError, USE_SAMPLE_MODE, fetchJson, requireApiBase } from './core';

function normalizeGuestToken(guestToken) {
  const normalized = String(guestToken || '').trim();
  if (!normalized) {
    throw new ApiError('guestToken is required', 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

function requirePlayerProfileApi() {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    throw new ApiError('Player profile sync is unavailable in sample mode', 0, 'SAMPLE_MODE_UNSUPPORTED');
  }
}

export async function fetchRemotePlayerProfile(guestToken) {
  requirePlayerProfileApi();
  const normalizedGuestToken = normalizeGuestToken(guestToken);
  try {
    return await fetchJson(`${API_BASE}/api/player-profiles/${encodeURIComponent(normalizedGuestToken)}`);
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

export async function upsertRemotePlayerProfile(profile) {
  requirePlayerProfileApi();
  const normalizedGuestToken = normalizeGuestToken(profile?.guestToken);
  return fetchJson(`${API_BASE}/api/player-profiles/${encodeURIComponent(normalizedGuestToken)}`, {
    method: 'PUT',
    body: { profile }
  });
}
