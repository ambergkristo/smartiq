import {
  DEFAULT_GUEST_PROFILE_NAME,
  PLAYER_PROFILE_STORAGE_KEY,
  calculatePlayerLevel,
  getTodaysDailyChallenge,
  loadOrCreatePlayerProfile,
  loadStoredPlayerProfile,
  recordDailyChallengeResult,
  recordDailyChallengeStarted,
  recordSoloGameStarted,
  recordSoloRoundResult,
  updatePlayerProfileDisplayName
} from './playerProfile';

describe('playerProfile', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('creates a guest profile on first use', () => {
    const profile = loadOrCreatePlayerProfile();

    expect(profile.displayName).toBe(DEFAULT_GUEST_PROFILE_NAME);
    expect(profile.level).toBe(1);
    expect(profile.gamesPlayed).toBe(0);
    expect(profile.roundsPlayed).toBe(0);
    expect(profile.roundsWon).toBe(0);
    expect(profile.bestRoundXp).toBe(0);
    expect(profile.bestSessionXp).toBe(0);
    expect(profile.bestWinStreak).toBe(0);
    expect(getTodaysDailyChallenge(profile, '2026-04-23')).toMatchObject({
      date: '2026-04-23',
      status: 'available'
    });
    expect(loadStoredPlayerProfile()).toMatchObject({
      id: profile.id,
      guestToken: profile.guestToken
    });
  });

  test('calculates levels at 500 XP thresholds', () => {
    expect(calculatePlayerLevel(0)).toBe(1);
    expect(calculatePlayerLevel(499)).toBe(1);
    expect(calculatePlayerLevel(500)).toBe(2);
    expect(calculatePlayerLevel(1000)).toBe(3);
  });

  test('updates display name and preserves guest fallback', () => {
    const profile = loadOrCreatePlayerProfile();
    const renamed = updatePlayerProfileDisplayName(profile, 'Kai');
    const reset = updatePlayerProfileDisplayName(renamed, '   ');

    expect(renamed.displayName).toBe('Kai');
    expect(reset.displayName).toBe(DEFAULT_GUEST_PROFILE_NAME);
  });

  test('normalizes older profiles without rounds played from rounds won', () => {
    localStorage.setItem(PLAYER_PROFILE_STORAGE_KEY, JSON.stringify({
      id: 'profile_legacy',
      guestToken: 'guest_legacy',
      displayName: 'Kai',
      totalXp: 500,
      gamesPlayed: 3,
      roundsWon: 2,
      createdAt: '2026-03-12T10:00:00.000Z',
      updatedAt: '2026-03-12T10:00:00.000Z'
    }));

    expect(loadStoredPlayerProfile()).toMatchObject({
      displayName: 'Kai',
      roundsPlayed: 2,
      roundsWon: 2
    });
  });

  test('records games, XP, and round wins on the guest profile', () => {
    const profile = loadOrCreatePlayerProfile();
    const started = recordSoloGameStarted(profile);
    const wonRound = recordSoloRoundResult(started, { xpGained: 600, sessionXp: 600, wasSuccessful: true });
    const secondWonRound = recordSoloRoundResult(wonRound, { xpGained: 200, sessionXp: 800, wasSuccessful: true });
    const failedRound = recordSoloRoundResult(secondWonRound, { xpGained: 0, sessionXp: 800, wasSuccessful: false });

    expect(started.gamesPlayed).toBe(1);
    expect(wonRound.totalXp).toBe(600);
    expect(wonRound.level).toBe(2);
    expect(wonRound.roundsWon).toBe(1);
    expect(wonRound.roundsPlayed).toBe(1);
    expect(secondWonRound.roundsWon).toBe(2);
    expect(secondWonRound.roundsPlayed).toBe(2);
    expect(secondWonRound.bestRoundXp).toBe(600);
    expect(secondWonRound.bestSessionXp).toBe(800);
    expect(secondWonRound.currentWinStreak).toBe(2);
    expect(secondWonRound.bestWinStreak).toBe(2);
    expect(failedRound.roundsWon).toBe(2);
    expect(failedRound.roundsPlayed).toBe(3);
    expect(failedRound.currentWinStreak).toBe(0);
    expect(failedRound.bestWinStreak).toBe(2);
    expect(failedRound.lastPlayedAt).toEqual(expect.any(String));
  });

  test('records one daily challenge result for the active date', () => {
    const profile = loadOrCreatePlayerProfile();
    const started = recordDailyChallengeStarted(profile, '2026-04-23');
    const completed = recordDailyChallengeResult(started, {
      dateKey: '2026-04-23',
      xpGained: 300,
      sessionXp: 300,
      wasSuccessful: true
    });
    const nextStart = recordDailyChallengeStarted(completed, '2026-04-23');

    expect(started.gamesPlayed).toBe(1);
    expect(getTodaysDailyChallenge(started, '2026-04-23')).toMatchObject({
      date: '2026-04-23',
      status: 'started'
    });
    expect(completed.totalXp).toBe(300);
    expect(completed.roundsPlayed).toBe(1);
    expect(completed.roundsWon).toBe(1);
    expect(getTodaysDailyChallenge(completed, '2026-04-23')).toMatchObject({
      status: 'completed',
      outcome: 'success',
      roundXp: 300,
      sessionXp: 300
    });
    expect(nextStart.gamesPlayed).toBe(1);
    expect(getTodaysDailyChallenge(nextStart, '2026-04-24').status).toBe('available');
  });
});
