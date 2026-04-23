export const PLAYER_PROFILE_STORAGE_KEY = 'cherrypick.playerProfile.v1';
export const DEFAULT_GUEST_PROFILE_NAME = 'Solo Player';
const LEVEL_XP_STEP = 500;
const DAILY_CHALLENGE_STATUS = {
  AVAILABLE: 'available',
  STARTED: 'started',
  COMPLETED: 'completed'
};

function createProfileId(prefix: string) {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function nowIsoString() {
  return new Date().toISOString();
}

export function getDailyChallengeDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function normalizeDailyChallenge(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const challenge = value as Record<string, unknown>;
  const date = String(challenge.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const rawStatus = String(challenge.status || '').trim().toLowerCase();
  const status = rawStatus === DAILY_CHALLENGE_STATUS.COMPLETED
    ? DAILY_CHALLENGE_STATUS.COMPLETED
    : rawStatus === DAILY_CHALLENGE_STATUS.STARTED
      ? DAILY_CHALLENGE_STATUS.STARTED
      : DAILY_CHALLENGE_STATUS.AVAILABLE;
  const rawOutcome = String(challenge.outcome || '').trim().toLowerCase();
  const outcome = rawOutcome === 'success' || rawOutcome === 'fail' ? rawOutcome : null;

  return {
    date,
    status,
    outcome,
    roundXp: safeNumber(challenge.roundXp, 0),
    sessionXp: safeNumber(challenge.sessionXp, 0),
    startedAt: typeof challenge.startedAt === 'string' ? challenge.startedAt : null,
    completedAt: typeof challenge.completedAt === 'string' ? challenge.completedAt : null
  };
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
  const gamesPlayed = safeNumber(overrides.gamesPlayed, 0);
  const roundsWon = safeNumber(overrides.roundsWon, 0);
  const roundsPlayed = Math.max(safeNumber(overrides.roundsPlayed, roundsWon), roundsWon);

  return {
    id: String(overrides.id || createProfileId('profile')).trim(),
    userId: overrides.userId == null ? null : String(overrides.userId).trim() || null,
    guestToken,
    displayName: normalizePlayerDisplayName(overrides.displayName),
    totalXp,
    level: calculatePlayerLevel(totalXp),
    gamesPlayed,
    roundsPlayed,
    roundsWon,
    bestRoundXp: safeNumber(overrides.bestRoundXp, 0),
    bestSessionXp: safeNumber(overrides.bestSessionXp, 0),
    currentWinStreak: safeNumber(overrides.currentWinStreak, 0),
    bestWinStreak: safeNumber(overrides.bestWinStreak, 0),
    dailyChallenge: normalizeDailyChallenge(overrides.dailyChallenge),
    lastPlayedAt: typeof overrides.lastPlayedAt === 'string' ? overrides.lastPlayedAt : null,
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
    roundsPlayed: profile.roundsPlayed,
    roundsWon: profile.roundsWon,
    bestRoundXp: profile.bestRoundXp,
    bestSessionXp: profile.bestSessionXp,
    currentWinStreak: profile.currentWinStreak,
    bestWinStreak: profile.bestWinStreak,
    dailyChallenge: profile.dailyChallenge,
    lastPlayedAt: profile.lastPlayedAt,
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

export function getTodaysDailyChallenge(profile: Record<string, unknown>, dateKey = getDailyChallengeDateKey()) {
  const challenge = normalizeDailyChallenge(profile.dailyChallenge);
  if (!challenge || challenge.date !== dateKey) {
    return {
      date: dateKey,
      status: DAILY_CHALLENGE_STATUS.AVAILABLE,
      outcome: null,
      roundXp: 0,
      sessionXp: 0,
      startedAt: null,
      completedAt: null
    };
  }
  return challenge;
}

export function recordDailyChallengeStarted(profile: Record<string, unknown>, dateKey = getDailyChallengeDateKey()) {
  const current = getTodaysDailyChallenge(profile, dateKey);
  if (current.status === DAILY_CHALLENGE_STATUS.COMPLETED) {
    return {
      ...profile,
      dailyChallenge: current
    };
  }

  const timestamp = nowIsoString();
  return {
    ...profile,
    gamesPlayed: safeNumber(profile.gamesPlayed, 0) + 1,
    dailyChallenge: {
      date: dateKey,
      status: DAILY_CHALLENGE_STATUS.STARTED,
      outcome: null,
      roundXp: 0,
      sessionXp: 0,
      startedAt: timestamp,
      completedAt: null
    },
    updatedAt: timestamp
  };
}

export function recordSoloRoundResult(profile: Record<string, unknown>, input: { xpGained?: number; wasSuccessful?: boolean; sessionXp?: number } = {}) {
  const xpGained = safeNumber(input.xpGained, 0);
  const sessionXp = safeNumber(input.sessionXp, 0);
  const wasSuccessful = input.wasSuccessful === true;
  const totalXp = safeNumber(profile.totalXp, 0) + xpGained;
  const currentWinStreak = wasSuccessful ? safeNumber(profile.currentWinStreak, 0) + 1 : 0;
  const timestamp = nowIsoString();

  return {
    ...profile,
    totalXp,
    level: calculatePlayerLevel(totalXp),
    roundsPlayed: safeNumber(profile.roundsPlayed, 0) + 1,
    roundsWon: safeNumber(profile.roundsWon, 0) + (wasSuccessful ? 1 : 0),
    bestRoundXp: Math.max(safeNumber(profile.bestRoundXp, 0), xpGained),
    bestSessionXp: Math.max(safeNumber(profile.bestSessionXp, 0), sessionXp),
    currentWinStreak,
    bestWinStreak: Math.max(safeNumber(profile.bestWinStreak, 0), currentWinStreak),
    lastPlayedAt: timestamp,
    updatedAt: timestamp
  };
}

export function recordDailyChallengeResult(profile: Record<string, unknown>, input: { xpGained?: number; wasSuccessful?: boolean; sessionXp?: number; dateKey?: string } = {}) {
  const dateKey = typeof input.dateKey === 'string' && input.dateKey.trim()
    ? input.dateKey.trim()
    : getDailyChallengeDateKey();
  const updatedProfile = recordSoloRoundResult(profile, input);
  const timestamp = nowIsoString();

  return {
    ...updatedProfile,
    dailyChallenge: {
      date: dateKey,
      status: DAILY_CHALLENGE_STATUS.COMPLETED,
      outcome: input.wasSuccessful === true ? 'success' : 'fail',
      roundXp: safeNumber(input.xpGained, 0),
      sessionXp: safeNumber(input.sessionXp, 0),
      startedAt: getTodaysDailyChallenge(profile, dateKey).startedAt,
      completedAt: timestamp
    },
    updatedAt: timestamp
  };
}
