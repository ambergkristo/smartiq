export const PLAYER_PROFILE_STORAGE_KEY = 'cherrypick.playerProfile.v1';
export const DEFAULT_GUEST_PROFILE_NAME = 'Solo Player';
const LEVEL_XP_STEP = 500;

function createProfileId(prefix: string) {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIsoString() {
  return new Date().toISOString();
}

function normalizeStorage(storage?: Storage | null) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

function safeNumber(value: unknown, fallback = 0) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : fallback;
}

export function calculatePlayerLevel(totalXp: number) {
  const normalizedTotalXp = safeNumber(totalXp, 0);
  return Math.floor(normalizedTotalXp / LEVEL_XP_STEP) + 1;
}

export function normalizePlayerDisplayName(displayName: unknown) {
  const normalized = String(displayName || '').trim();
  return normalized || DEFAULT_GUEST_PROFILE_NAME;
}

export function createGuestPlayerProfile(overrides: Record<string, unknown> = {}) {
  const timestamp = nowIsoString();
  const guestToken = String(overrides.guestToken || createProfileId('guest')).trim();
  const totalXp = safeNumber(overrides.totalXp, 0);

  return {
    id: String(overrides.id || createProfileId('profile')).trim(),
    userId: overrides.userId == null ? null : String(overrides.userId).trim() || null,
    guestToken,
    displayName: normalizePlayerDisplayName(overrides.displayName),
    totalXp,
    level: calculatePlayerLevel(totalXp),
    gamesPlayed: safeNumber(overrides.gamesPlayed, 0),
    roundsWon: safeNumber(overrides.roundsWon, 0),
    createdAt: String(overrides.createdAt || timestamp),
    updatedAt: String(overrides.updatedAt || timestamp)
  };
}

export function savePlayerProfile(profile: Record<string, unknown>, storage?: Storage | null) {
  const resolvedStorage = normalizeStorage(storage);
  if (!resolvedStorage) {
    return;
  }
  resolvedStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

export function parsePlayerProfile(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const profile = value as Record<string, unknown>;
  const id = String(profile.id || '').trim();
  const guestToken = String(profile.guestToken || '').trim();
  if (!id || !guestToken) {
    return null;
  }

  return createGuestPlayerProfile({
    id,
    userId: profile.userId,
    guestToken,
    displayName: profile.displayName,
    totalXp: profile.totalXp,
    gamesPlayed: profile.gamesPlayed,
    roundsWon: profile.roundsWon,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt
  });
}

export function loadStoredPlayerProfile(storage?: Storage | null) {
  const resolvedStorage = normalizeStorage(storage);
  if (!resolvedStorage) {
    return null;
  }

  try {
    const raw = resolvedStorage.getItem(PLAYER_PROFILE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parsePlayerProfile(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function loadOrCreatePlayerProfile(storage?: Storage | null) {
  const resolvedStorage = normalizeStorage(storage);
  const existingProfile = loadStoredPlayerProfile(resolvedStorage);
  if (existingProfile) {
    return existingProfile;
  }

  const nextProfile = createGuestPlayerProfile();
  savePlayerProfile(nextProfile, resolvedStorage);
  return nextProfile;
}

export function updatePlayerProfileDisplayName(profile: Record<string, unknown>, displayName: unknown) {
  return {
    ...profile,
    displayName: normalizePlayerDisplayName(displayName),
    updatedAt: nowIsoString()
  };
}

export function recordSoloGameStarted(profile: Record<string, unknown>) {
  return {
    ...profile,
    gamesPlayed: safeNumber(profile.gamesPlayed, 0) + 1,
    updatedAt: nowIsoString()
  };
}

export function recordSoloRoundResult(profile: Record<string, unknown>, input: { xpGained?: number; wasSuccessful?: boolean } = {}) {
  const xpGained = safeNumber(input.xpGained, 0);
  const wasSuccessful = input.wasSuccessful === true;
  const totalXp = safeNumber(profile.totalXp, 0) + xpGained;

  return {
    ...profile,
    totalXp,
    level: calculatePlayerLevel(totalXp),
    roundsWon: safeNumber(profile.roundsWon, 0) + (wasSuccessful ? 1 : 0),
    updatedAt: nowIsoString()
  };
}
