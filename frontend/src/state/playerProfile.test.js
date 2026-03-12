import {
  DEFAULT_GUEST_PROFILE_NAME,
  PLAYER_PROFILE_STORAGE_KEY,
  calculatePlayerLevel,
  loadOrCreatePlayerProfile,
  loadStoredPlayerProfile,
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
    expect(profile.roundsWon).toBe(0);
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

  test('records games, XP, and round wins on the guest profile', () => {
    const profile = loadOrCreatePlayerProfile();
    const started = recordSoloGameStarted(profile);
    const wonRound = recordSoloRoundResult(started, { xpGained: 600, wasSuccessful: true });
    const failedRound = recordSoloRoundResult(wonRound, { xpGained: 0, wasSuccessful: false });

    expect(started.gamesPlayed).toBe(1);
    expect(wonRound.totalXp).toBe(600);
    expect(wonRound.level).toBe(2);
    expect(wonRound.roundsWon).toBe(1);
    expect(failedRound.roundsWon).toBe(1);
  });
});
