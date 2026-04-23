export const PLAYER_ANALYTICS_STORAGE_KEY = 'cherrypick.playerAnalytics.v1';

export const PLAYER_ANALYTICS_EVENT = {
  FIRST_VISIT: 'first_visit',
  RUN_START: 'run_start',
  ROUND_FAIL: 'round_fail',
  ROUND_WIN: 'round_win',
  RESULT_VIEW: 'result_view',
  REPLAY: 'replay'
};

const KNOWN_EVENT_TYPES = new Set(Object.values(PLAYER_ANALYTICS_EVENT));
const MAX_STORED_EVENTS = 200;

function normalizeStorage(storage?: Storage | null) {
  if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
    return storage;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage;
  }
  return null;
}

function nowIsoString() {
  return new Date().toISOString();
}

function createEventId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `event_${globalThis.crypto.randomUUID()}`;
  }
  return `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as Record<string, unknown>) };
}

function normalizeEvent(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const event = value as Record<string, unknown>;
  const eventType = String(event.eventType || '').trim();
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    return null;
  }

  return {
    id: String(event.id || createEventId()).trim(),
    eventType,
    occurredAt: typeof event.occurredAt === 'string' ? event.occurredAt : nowIsoString(),
    payload: normalizePayload(event.payload)
  };
}

export function loadStoredPlayerAnalyticsEvents(storage?: Storage | null) {
  const resolvedStorage = normalizeStorage(storage);
  if (!resolvedStorage) {
    return [];
  }

  try {
    const raw = resolvedStorage.getItem(PLAYER_ANALYTICS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map(normalizeEvent)
      .filter(Boolean)
      .slice(-MAX_STORED_EVENTS);
  } catch {
    return [];
  }
}

export function savePlayerAnalyticsEvents(events: unknown[], storage?: Storage | null) {
  const resolvedStorage = normalizeStorage(storage);
  if (!resolvedStorage) {
    return [];
  }

  const normalizedEvents = Array.isArray(events)
    ? events.map(normalizeEvent).filter(Boolean).slice(-MAX_STORED_EVENTS)
    : [];
  resolvedStorage.setItem(PLAYER_ANALYTICS_STORAGE_KEY, JSON.stringify(normalizedEvents));
  return normalizedEvents;
}

export function recordPlayerAnalyticsEvent(eventType: string, payload: Record<string, unknown> = {}, storage?: Storage | null) {
  if (!KNOWN_EVENT_TYPES.has(eventType)) {
    return loadStoredPlayerAnalyticsEvents(storage);
  }

  const events = loadStoredPlayerAnalyticsEvents(storage);
  const nextEvents = [
    ...events,
    {
      id: createEventId(),
      eventType,
      occurredAt: nowIsoString(),
      payload: normalizePayload(payload)
    }
  ];
  return savePlayerAnalyticsEvents(nextEvents, storage);
}

export function recordFirstVisitAnalyticsEvent(profile: Record<string, unknown>, storage?: Storage | null) {
  const events = loadStoredPlayerAnalyticsEvents(storage);
  const profileId = String(profile?.id || '').trim();
  const guestToken = String(profile?.guestToken || '').trim();
  const alreadyRecorded = events.some((event) => (
    event.eventType === PLAYER_ANALYTICS_EVENT.FIRST_VISIT
    && (
      String(event.payload?.profileId || '') === profileId
      || String(event.payload?.guestToken || '') === guestToken
    )
  ));

  if (alreadyRecorded) {
    return events;
  }

  return recordPlayerAnalyticsEvent(PLAYER_ANALYTICS_EVENT.FIRST_VISIT, {
    profileId,
    guestToken,
    displayName: profile?.displayName || ''
  }, storage);
}

export function summarizePlayerAnalyticsEvents(events: unknown[]) {
  const normalizedEvents = Array.isArray(events)
    ? events.map(normalizeEvent).filter(Boolean)
    : [];

  const count = (eventType: string) => normalizedEvents.filter((event) => event.eventType === eventType).length;
  const firstVisit = normalizedEvents.find((event) => event.eventType === PLAYER_ANALYTICS_EVENT.FIRST_VISIT);
  const lastEvent = normalizedEvents[normalizedEvents.length - 1] || null;

  return {
    totalEvents: normalizedEvents.length,
    firstVisitAt: firstVisit?.occurredAt || null,
    lastEventAt: lastEvent?.occurredAt || null,
    runsStarted: count(PLAYER_ANALYTICS_EVENT.RUN_START),
    replays: count(PLAYER_ANALYTICS_EVENT.REPLAY),
    roundWins: count(PLAYER_ANALYTICS_EVENT.ROUND_WIN),
    roundFails: count(PLAYER_ANALYTICS_EVENT.ROUND_FAIL),
    resultViews: count(PLAYER_ANALYTICS_EVENT.RESULT_VIEW)
  };
}
