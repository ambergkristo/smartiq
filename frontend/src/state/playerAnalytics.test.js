import {
  PLAYER_ANALYTICS_EVENT,
  PLAYER_ANALYTICS_STORAGE_KEY,
  loadStoredPlayerAnalyticsEvents,
  recordFirstVisitAnalyticsEvent,
  recordPlayerAnalyticsEvent,
  summarizePlayerAnalyticsEvents
} from './playerAnalytics';

describe('playerAnalytics', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('records first visit once for a guest profile', () => {
    const profile = {
      id: 'profile_1',
      guestToken: 'guest_1',
      displayName: 'Kai'
    };

    const firstPass = recordFirstVisitAnalyticsEvent(profile);
    const secondPass = recordFirstVisitAnalyticsEvent(profile);

    expect(firstPass).toHaveLength(1);
    expect(secondPass).toHaveLength(1);
    expect(loadStoredPlayerAnalyticsEvents()).toEqual([
      expect.objectContaining({
        eventType: PLAYER_ANALYTICS_EVENT.FIRST_VISIT,
        payload: expect.objectContaining({
          profileId: 'profile_1',
          guestToken: 'guest_1',
          displayName: 'Kai'
        })
      })
    ]);
  });

  test('records and summarizes replay funnel events', () => {
    recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.RUN_START, { mode: 'solo' });
    recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.ROUND_WIN, { mode: 'solo', roundXp: 100 });
    recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.RESULT_VIEW, { mode: 'solo' });
    recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.REPLAY, { mode: 'solo' });
    recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.ROUND_FAIL, { mode: 'solo' });

    expect(summarizePlayerAnalyticsEvents(loadStoredPlayerAnalyticsEvents())).toMatchObject({
      runsStarted: 1,
      replays: 1,
      roundWins: 1,
      roundFails: 1,
      resultViews: 1
    });
  });

  test('ignores corrupt stored analytics data', () => {
    localStorage.setItem(PLAYER_ANALYTICS_STORAGE_KEY, '{broken');

    expect(loadStoredPlayerAnalyticsEvents()).toEqual([]);
  });
});
