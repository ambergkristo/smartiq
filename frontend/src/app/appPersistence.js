import { DEFAULT_LANGS } from '../state/types';
import { normalizeRoomCodeInput } from '../roomRuntime';
import {
  CONFIG_STORAGE_KEY,
  ENTRY_ROUTE,
  ROOM_SELECTION_STORAGE_PREFIX,
  ROOM_SESSION_STORAGE_KEY,
  SESSION_REVIEW_NOTE_STORAGE_PREFIX,
  THEME_OPTIONS
} from './appConfig';

export function resolvePlayerJoinRoute() {
  if (typeof window === 'undefined') {
    return null;
  }
  const hash = String(window.location?.hash || '').trim();
  const match = hash.match(/^#\/join\/([A-Za-z0-9-]+)$/i);
  if (!match) {
    return null;
  }
  return normalizeRoomCodeInput(match[1]);
}

export function resolveEntryRoute() {
  if (typeof window === 'undefined') {
    return ENTRY_ROUTE.HOME;
  }
  const hash = String(window.location?.hash || '').trim().toLowerCase();
  if (hash === '#/play' || hash === '#/practice') {
    return ENTRY_ROUTE.PLAY;
  }
  if (hash === '#/start') {
    return ENTRY_ROUTE.START;
  }
  if (hash === '#/join') {
    return ENTRY_ROUTE.JOIN;
  }
  if (hash === '#/host') {
    return ENTRY_ROUTE.HOST;
  }
  if (hash === '#/host/trial') {
    return ENTRY_ROUTE.HOST_TRIAL;
  }
  if (hash === '#/host/signin') {
    return ENTRY_ROUTE.HOST_SIGNIN;
  }
  return ENTRY_ROUTE.HOME;
}

export function navigateToRoomJoinRoute(roomCode) {
  const normalizedRoomCode = normalizeRoomCodeInput(roomCode);
  if (typeof window === 'undefined' || !normalizedRoomCode) {
    return;
  }
  window.location.hash = `#/join/${normalizedRoomCode}`;
}

export function resolveBillingReturnState() {
  if (typeof window === 'undefined') {
    return null;
  }
  const pathname = String(window.location?.pathname || '').trim().toLowerCase();
  if (pathname.endsWith('/billing/success')) {
    return 'success';
  }
  if (pathname.endsWith('/billing/cancel')) {
    return 'cancel';
  }
  const search = new URLSearchParams(String(window.location?.search || ''));
  const queryState = String(search.get('smartiq_billing') || '').trim().toLowerCase();
  if (queryState === 'success' || queryState === 'cancel') {
    return queryState;
  }
  return null;
}

export function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      topic: typeof parsed.topic === 'string' ? parsed.topic : '',
      difficulty: ['1', '2', '3'].includes(String(parsed.difficulty)) ? String(parsed.difficulty) : '2',
      lang: DEFAULT_LANGS.includes(parsed.lang) ? parsed.lang : 'en',
      theme: THEME_OPTIONS.some((entry) => entry.value === parsed.theme) ? parsed.theme : 'classic',
      playersText: typeof parsed.playersText === 'string' ? parsed.playersText : ''
    };
  } catch {
    return null;
  }
}

export function loadStoredRoomSession() {
  try {
    const raw = localStorage.getItem(ROOM_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const roomCode = String(parsed.roomCode || '').trim().toUpperCase();
    const playerId = String(parsed.playerId || '').trim();
    const authToken = String(parsed.authToken || '').trim();
    if (!roomCode || !playerId || !authToken) {
      return null;
    }
    return {
      roomCode,
      playerId,
      authToken,
      displayName: String(parsed.displayName || '').trim(),
      role: String(parsed.role || '').trim().toLowerCase() === 'host' ? 'host' : 'player',
      roomState: Array.isArray(parsed.roomState?.players)
        ? {
          roomCode,
          phase: String(parsed.roomState?.phase || '').trim().toUpperCase() || 'WAITING',
          joinable: parsed.roomState?.joinable !== false,
          activeGame: parsed.roomState?.activeGame && typeof parsed.roomState.activeGame === 'object'
            ? {
              gameId: String(parsed.roomState.activeGame.gameId || '').trim(),
              topic: String(parsed.roomState.activeGame.topic || '').trim(),
              status: String(parsed.roomState.activeGame.status || '').trim(),
              roundNumber: Number.isInteger(parsed.roomState.activeGame.roundNumber)
                ? parsed.roomState.activeGame.roundNumber
                : null
            }
            : null,
          branding: parsed.roomState?.branding && typeof parsed.roomState.branding === 'object'
            ? {
              appName: String(parsed.roomState.branding.appName || '').trim(),
              logoUrl: String(parsed.roomState.branding.logoUrl || '').trim(),
              primaryColor: String(parsed.roomState.branding.primaryColor || '').trim(),
              secondaryColor: String(parsed.roomState.branding.secondaryColor || '').trim()
            }
            : null,
          players: parsed.roomState.players
        }
        : null
    };
  } catch {
    return null;
  }
}

export function buildRoomSelectionStorageKey(roomCode) {
  const normalized = normalizeRoomCodeInput(String(roomCode || ''));
  return normalized ? `${ROOM_SELECTION_STORAGE_PREFIX}${normalized}` : '';
}

export function loadStoredRoomSelection(roomCode) {
  try {
    const key = buildRoomSelectionStorageKey(roomCode);
    if (!key) {
      return [];
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry) => String(entry || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function buildSessionReviewNoteStorageKey(gameId) {
  const normalized = String(gameId || '').trim();
  return normalized ? `${SESSION_REVIEW_NOTE_STORAGE_PREFIX}${normalized}` : '';
}

export function loadSessionReviewNote(gameId) {
  try {
    const key = buildSessionReviewNoteStorageKey(gameId);
    if (!key) {
      return '';
    }
    return String(localStorage.getItem(key) || '').trim();
  } catch {
    return '';
  }
}

export function persistSessionReviewNote(gameId, note) {
  const key = buildSessionReviewNoteStorageKey(gameId);
  if (!key) {
    return;
  }
  const normalized = String(note || '').trim();
  if (!normalized) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, normalized);
}

export function persistRoomSession(session) {
  if (!session) {
    localStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ROOM_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function persistRoomSelection(roomCode, selectedPlayerNames) {
  const key = buildRoomSelectionStorageKey(roomCode);
  if (!key) {
    return;
  }
  if (!Array.isArray(selectedPlayerNames) || selectedPlayerNames.length === 0) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(selectedPlayerNames));
}

export function isAdminConsoleRoute() {
  if (typeof window === 'undefined') {
    return false;
  }
  const pathname = window.location?.pathname || '';
  const hash = window.location?.hash || '';
  return pathname.startsWith('/admin') || hash.startsWith('#/admin');
}
