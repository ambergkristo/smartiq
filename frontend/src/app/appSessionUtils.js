import { MAX_PLAYERS_PER_ROOM } from '../constants/runtime';
import { getRoomPlayerNames, normalizePlayerName } from '../roomRuntime';
import { STRINGS, THEME_OPTIONS } from './appConfig';
import { loadSessionReviewNote } from './appPersistence';

export function isTestMode() {
  return String(import.meta.env.MODE || '').toLowerCase() === 'test';
}

export function parsePlayers(text) {
  return Array.from(
    new Set(
      String(text || '')
        .split(',')
        .map(normalizePlayerName)
        .filter(Boolean)
    )
  );
}

export function isSupportedTheme(theme) {
  return THEME_OPTIONS.some((entry) => entry.value === theme);
}

export function resolvePlanLimit(planCode) {
  const normalized = String(planCode || '').trim().toLowerCase();
  if (normalized.includes('starter')) return 1000;
  if (normalized.includes('pilot')) return 2000;
  if (normalized.includes('growth')) return 10000;
  return null;
}

export function formatSubscriptionStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return 'Not configured';
  }
  return normalized.replace(/_/g, ' ');
}

export function formatAuditAction(action) {
  const normalized = String(action || '').trim();
  if (!normalized) {
    return 'Tenant event';
  }
  return normalized.toLowerCase().replace(/_/g, ' ');
}

export function resolveHostedRuntimeBlockMessage(subscription) {
  const normalizedStatus = String(subscription?.status || '').trim().toLowerCase();
  if (normalizedStatus === 'past_due') {
    return STRINGS.hostedRuntimePastDue;
  }
  if (normalizedStatus === 'canceled') {
    return STRINGS.hostedRuntimeCanceled;
  }
  return '';
}

export function deriveRecentHostedSessions(auditEvents) {
  if (!Array.isArray(auditEvents)) {
    return [];
  }
  const byGameId = new Map();
  auditEvents.forEach((entry) => {
    const action = String(entry?.action || '').trim().toUpperCase();
    if (action !== 'HOST_GAME_SESSION_CREATED' && action !== 'HOST_GAME_SESSION_COMPLETED') {
      return;
    }
    const metadata = entry?.metadata && typeof entry.metadata === 'object' ? entry.metadata : {};
    const gameId = String(entry?.entityId || metadata.gameId || '').trim();
    if (!gameId) {
      return;
    }
    const existing = byGameId.get(gameId) || {
      gameId,
      topic: '',
      language: '',
      playerCount: null,
      status: 'live',
      createdAt: '',
      completedAt: '',
      winnerDisplayName: '',
      winnerScore: null
    };
    if (action === 'HOST_GAME_SESSION_CREATED') {
      existing.topic = String(metadata.topic || existing.topic || '').trim();
      existing.language = String(metadata.language || existing.language || '').trim();
      existing.playerCount = Number.isInteger(metadata.playerCount) ? metadata.playerCount : existing.playerCount;
      existing.createdAt = String(entry?.eventTime || existing.createdAt || '').trim();
    }
    if (action === 'HOST_GAME_SESSION_COMPLETED') {
      existing.status = 'completed';
      existing.completedAt = String(entry?.eventTime || existing.completedAt || '').trim();
      existing.topic = String(metadata.topic || existing.topic || '').trim();
      existing.winnerDisplayName = String(metadata.winnerDisplayName || existing.winnerDisplayName || '').trim();
      existing.winnerScore = Number.isInteger(metadata.winnerScore) ? metadata.winnerScore : existing.winnerScore;
    }
    byGameId.set(gameId, existing);
  });

  return Array.from(byGameId.values())
    .sort((left, right) => {
      const leftTime = Date.parse(left.completedAt || left.createdAt || '');
      const rightTime = Date.parse(right.completedAt || right.createdAt || '');
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    })
    .slice(0, 6);
}

export function buildHostWorkspaceAnalytics(sessions, templateCount, sessionReviewNotes) {
  const normalizedSessions = Array.isArray(sessions) ? sessions : [];
  const playerCounts = normalizedSessions
    .map((entry) => (Number.isInteger(entry?.playerCount) ? entry.playerCount : null))
    .filter((value) => value != null);
  const followUpSessions = normalizedSessions.filter((entry) => Boolean(resolveSessionReviewNote(sessionReviewNotes, entry?.gameId))).length;
  const topicCounts = normalizedSessions.reduce((accumulator, entry) => {
    const topic = String(entry?.topic || '').trim() || STRINGS.recentHostedSessionTopicFallback;
    accumulator.set(topic, (accumulator.get(topic) || 0) + 1);
    return accumulator;
  }, new Map());
  const topTopicEntry = Array.from(topicCounts.entries()).sort((left, right) => right[1] - left[1])[0] || null;
  const latestWinner = normalizedSessions.find((entry) => entry?.status === 'completed' && entry?.winnerDisplayName);
  const averagePlayers = playerCounts.length > 0
    ? Math.round((playerCounts.reduce((sum, value) => sum + value, 0) / playerCounts.length) * 10) / 10
    : null;

  return {
    totalSessions: normalizedSessions.length,
    completedSessions: normalizedSessions.filter((entry) => entry?.status === 'completed').length,
    liveSessions: normalizedSessions.filter((entry) => entry?.status !== 'completed').length,
    averagePlayers,
    followUpSessions,
    topTopic: topTopicEntry?.[0] || STRINGS.recentHostedSessionTopicFallback,
    latestWinner: latestWinner?.winnerDisplayName
      ? `${latestWinner.winnerDisplayName}${Number.isInteger(latestWinner.winnerScore) ? ` (${latestWinner.winnerScore} pts)` : ''}`
      : STRINGS.hostWorkspaceAnalyticsWinnerFallback,
    templateCount: Number.isInteger(templateCount) ? templateCount : 0
  };
}

export function formatRecentHostedSessionPhase(phase) {
  const normalized = String(phase || '').trim().toLowerCase();
  if (!normalized) {
    return 'Unknown phase';
  }
  return normalized.replace(/_/g, ' ');
}

export function buildRecentHostedSessionReview(snapshot, fallbackSession) {
  const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
  const totalScores = snapshot?.totalScores && typeof snapshot.totalScores === 'object'
    ? snapshot.totalScores
    : {};
  const scoreboard = players.map((player) => {
    const playerId = String(player?.playerId || '').trim();
    const displayName = String(player?.displayName || playerId || 'Player').trim() || 'Player';
    return {
      playerId,
      displayName,
      score: Number.isInteger(totalScores[playerId]) ? totalScores[playerId] : 0
    };
  });
  const sortedScoreboard = [...scoreboard].sort((left, right) => right.score - left.score);
  const leader = sortedScoreboard[0] || null;
  const normalizedPhase = String(snapshot?.roundState?.phase || '').trim().toUpperCase();

  return {
    gameId: String(snapshot?.gameId || fallbackSession?.gameId || '').trim(),
    topic: String(snapshot?.boardState?.topic || fallbackSession?.topic || '').trim(),
    language: String(fallbackSession?.language || '').trim().toLowerCase(),
    question: String(snapshot?.boardState?.question || '').trim(),
    roundNumber: Number.isInteger(snapshot?.roundState?.roundNumber) ? snapshot.roundState.roundNumber : 1,
    phase: formatRecentHostedSessionPhase(snapshot?.roundState?.phase),
    lastAction: String(snapshot?.roundState?.lastAction || '').trim(),
    scoreboard,
    leaderDisplayName: leader?.displayName || '',
    leaderScore: Number.isInteger(leader?.score) ? leader.score : 0,
    playerCount: scoreboard.length,
    isCompleted: normalizedPhase === 'GAME_OVER'
  };
}

export function buildPlaceholderPlayers(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount <= 0) {
    return [];
  }
  return Array.from({ length: Math.min(playerCount, MAX_PLAYERS_PER_ROOM) }, (_, index) => `Player ${index + 1}`);
}

export function resolveRecentHostedSessionConfig(session, fallbackConfig, roomSession, reviewedSession) {
  const roomPlayerNames = getRoomPlayerNames(roomSession);
  const reviewedPlayerNames = reviewedSession?.gameId === session?.gameId && Array.isArray(reviewedSession?.scoreboard)
    ? reviewedSession.scoreboard
      .map((entry) => normalizePlayerName(entry?.displayName || entry?.playerId || ''))
      .filter(Boolean)
    : [];
  const placeholderPlayers = buildPlaceholderPlayers(session?.playerCount);
  return {
    topic: String(session?.topic || '').trim(),
    lang: fallbackConfig.lang,
    playersText: reviewedPlayerNames.length > 0
      ? reviewedPlayerNames.join(', ')
      : roomPlayerNames.length > 0
        ? roomPlayerNames.join(', ')
        : placeholderPlayers.length > 0
          ? placeholderPlayers.join(', ')
          : fallbackConfig.playersText
  };
}

export function buildBrandingDraft(brandingResponse) {
  const branding = brandingResponse?.branding && typeof brandingResponse.branding === 'object'
    ? brandingResponse.branding
    : null;
  return {
    appName: String(branding?.appName || '').trim(),
    logoUrl: String(branding?.logoUrl || '').trim(),
    primaryColor: String(branding?.primaryColor || '#1E293B').trim() || '#1E293B',
    secondaryColor: String(branding?.secondaryColor || '#0EA5E9').trim() || '#0EA5E9'
  };
}

export function buildRecentHostedSessionTemplateInput(review, session, fallbackTheme) {
  const topic = String(review?.topic || session?.topic || '').trim();
  const language = String(review?.language || session?.language || 'en').trim().toLowerCase() || 'en';
  const players = Array.isArray(review?.scoreboard) && review.scoreboard.length > 0
    ? review.scoreboard
      .map((entry) => normalizePlayerName(entry?.displayName || entry?.playerId || ''))
      .filter(Boolean)
    : buildPlaceholderPlayers(session?.playerCount);
  const resolvedTopic = topic || STRINGS.recentHostedSessionTopicFallback;
  return {
    name: `${resolvedTopic} replay`,
    topic,
    language,
    theme: isSupportedTheme(fallbackTheme) ? fallbackTheme : 'classic',
    players
  };
}

export function buildSessionTemplateDraft() {
  return {
    name: ''
  };
}

export function readRuntimeSessionTemplates(settingsResponse) {
  const templates = settingsResponse?.settings?.host?.sessionTemplates;
  if (!Array.isArray(templates)) {
    return [];
  }
  return templates
    .map((entry) => ({
      templateId: String(entry?.templateId || '').trim(),
      name: String(entry?.name || '').trim(),
      topic: String(entry?.topic || '').trim(),
      language: String(entry?.language || '').trim().toLowerCase() || 'en',
      theme: isSupportedTheme(entry?.theme) ? entry.theme : 'classic',
      players: Array.isArray(entry?.players)
        ? Array.from(new Set(entry.players.map((player) => normalizePlayerName(String(player || ''))).filter(Boolean)))
        : [],
      updatedAt: String(entry?.updatedAt || '').trim()
    }))
    .filter((entry) => entry.templateId && entry.name && entry.players.length > 0);
}

export function buildSessionReviewNoteLookup(notes) {
  if (!Array.isArray(notes)) {
    return {};
  }
  return notes.reduce((accumulator, entry) => {
    const gameId = String(entry?.gameId || '').trim();
    const note = String(entry?.note || '').trim();
    if (!gameId || !note) {
      return accumulator;
    }
    accumulator[gameId] = note;
    return accumulator;
  }, {});
}

export function readRuntimeSessionReviewNotes(settingsResponse) {
  return buildSessionReviewNoteLookup(settingsResponse?.settings?.host?.sessionReviewNotes);
}

export function resolveSessionReviewNote(sessionReviewNotes, gameId) {
  const normalizedGameId = String(gameId || '').trim();
  if (!normalizedGameId) {
    return '';
  }
  const runtimeNote = String(sessionReviewNotes?.[normalizedGameId] || '').trim();
  if (runtimeNote) {
    return runtimeNote;
  }
  return loadSessionReviewNote(normalizedGameId);
}

export function shouldClearRoomSessionAfterResumeFailure(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }
  if (error.code === 'CONFIG_ERROR' || error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') {
    return false;
  }
  if (typeof error.status === 'number') {
    if (error.status >= 500) {
      return false;
    }
    if (error.status >= 400) {
      return true;
    }
  }
  return error.code === 'ROOM_NOT_FOUND'
    || error.code === 'INVALID_ROOM_TOKEN'
    || error.code === 'PLAYER_NOT_FOUND'
    || error.code === 'VALIDATION_ERROR';
}

export function formatSessionReviewNotePreview(note) {
  const normalized = String(note || '').trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
}

export function isDeckExhaustedMessage(message) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('no playable cards for this filter')
    || normalized.includes('question bank is empty for this filter');
}
