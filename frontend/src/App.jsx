import { useCallback, useEffect, useRef, useState } from 'react';
import {
  API_BASE,
  bootstrapOnboardingTenant,
  clearRuntimeAuthContext,
  completeRuntimeAuth,
  createRoomSession,
  duplicateServerGameSession,
  deleteRuntimeSessionTemplate,
  fetchRoomPreview,
  fetchTenantAuditEvents,
  fetchNextCard,
  resumeServerGameSession,
  fetchServerGameSession,
  fetchTenantRuntimeSnapshot,
  fetchTenantUsageSummary,
  fetchTopics,
  hasRuntimeAuthContext,
  initiateCheckoutSession,
  joinRoomSession,
  logoutRuntimeAuth,
  rejoinRoomSession,
  requestRuntimeAuthLink,
  setRuntimeAuthContext,
  upsertRuntimeSessionTemplate,
  updateRuntimeTenantBranding,
  resolveCardErrorMessage,
  resolveTopicsErrorState
} from './api';
import AdminConsole from './admin/AdminConsole';
import GameBoard from './components/GameBoard';
import RoundSummary from './components/RoundSummary';
import { useAudioFeedback } from './audio/useAudioFeedback';
import { useGameEngine } from './state/useGameEngine';
import { useServerGameEngine } from './state/useServerGameEngine';
import { DEFAULT_LANGS, GamePhase } from './state/types';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Start a Smart10-style random deck game. Topic filter is optional.',
  loadingTopics: 'Loading topics...',
  noTopics: 'No topics yet.',
  noTopicsHint: 'Import clean cards to populate topics and retry.',
  startRound: 'Start game',
  loadingCard: 'Loading round card...',
  retry: 'Retry',
  checkBackendUrl: 'Check backend URL:',
  openHealth: 'Open health',
  passNote: 'Pass keeps points and skips your turn for this round (after at least one correct answer).',
  cardErrorFallback: 'Could not load card from backend. Retry to continue.',
  deckExhausted: 'No playable cards for this filter.',
  deckExhaustedHint: 'Change filters or restart game to continue.',
  changeFilters: 'Change filters',
  restartGame: 'Restart game',
  playersPlaceholder: 'Type player names and press Enter (or comma)',
  addPlayerHint: 'At least one player is required.',
  onboardingTitle: 'Set up your first quiz workspace',
  onboardingHint: 'Create a tenant + owner account context for this browser session.',
  onboardingWorkspaceLabel: 'Workspace name',
  onboardingWorkspacePlaceholder: 'Example: Northwind Quiz Night',
  onboardingEmailLabel: 'Owner email',
  onboardingEmailPlaceholder: 'owner@example.com',
  onboardingNameLabel: 'Display name (optional)',
  onboardingNamePlaceholder: 'Host name',
  onboardingSubmit: 'Create workspace',
  onboardingSubmitting: 'Creating workspace...',
  onboardingSuccess: 'Workspace ready. Tenant runtime context is now active.',
  signInTitle: 'Sign in to an existing host workspace',
  signInHint: 'Restore a host session without using internal headers.',
  signInEmailLabel: 'Host email',
  signInEmailPlaceholder: 'owner@example.com',
  signInTenantLabel: 'Tenant ID (optional)',
  signInTenantPlaceholder: 'Required only if your account belongs to multiple tenants',
  signInSubmit: 'Send sign-in link',
  signInSubmitting: 'Signing in...',
  signInSuccess: 'Host session restored.',
  launchPanelEyebrow: 'Narrow launch for recurring live quiz hosts',
  launchPanelTitle: 'Run branded recurring quiz nights without rebuilding the setup every week.',
  launchPanelHint: 'SmartIQ is aimed at small professional hosts: community organizers, event operators, and recurring venue quiz nights.',
  launchPanelPrimaryCta: 'Start free host trial',
  launchPanelSecondaryCta: 'Sign in to existing workspace',
  launchPanelValueTitle: 'What the launch plan includes',
  launchPanelValue1: 'Branded host and player entry surfaces with one canonical create, join, replay, and duplicate-event flow.',
  launchPanelValue2: 'Host workspace with templates, recent session history, review, and replay tools built for repeat events.',
  launchPanelValue3: 'Runtime billing recovery, capability enforcement, and recurring-host support tracking already wired into the product.',
  launchPanelPricingTitle: 'Launch pricing',
  launchPanelPricingTrial: 'Trial',
  launchPanelPricingTrialDetail: 'Short evaluation path for first hosted runs and product fit checks.',
  launchPanelPricingPro: 'Pro Host',
  launchPanelPricingProDetail: 'Main paid plan for recurring hosts who need branding, analytics, templates, and larger live sessions.',
  launchPanelPricingTeam: 'Team/Agency later',
  launchPanelPricingTeamDetail: 'Reserved for multi-host collaboration after the solo recurring-host path is fully proven.',
  launchPanelAssuranceTitle: 'Launch assurances',
  launchPanelAssurance1: 'Hosted billing recovery path is built into the runtime.',
  launchPanelAssurance2: 'Recent host history, review, and duplicate launch are already first-class.',
  launchPanelAssurance3: 'Support and pilot evidence rails exist, even when launch proof is still below threshold.',
  signOutSubmit: 'Sign out',
  signOutSuccess: 'Signed out. Sign in again to restore tenant runtime.',
  sessionExpired: 'Host session expired or is invalid. Sign in again to restore tenant runtime.',
  upgradeSubmit: 'Upgrade to Pro',
  upgradeSubmitting: 'Starting checkout...',
  upgradeSuccessPrefix: 'Checkout initiated:',
  upgradeErrorFallback: 'Could not start checkout. Retry in a moment.',
  upgradeContinueSubmit: 'Continue to checkout',
  upgradeRecoverySubmit: 'Restore billing',
  upgradeRedirecting: 'Redirecting to checkout...',
  upgradeRecoveryHint: 'If checkout does not open automatically, continue with the billing link below.',
  billingReturnRefreshing: 'Billing return detected. Refreshing workspace entitlements...',
  billingReturnRestored: 'Billing restored. Paid capabilities are now active.',
  billingReturnPending: 'Billing return detected. Entitlements are still syncing; refresh again in a moment.',
  billingReturnCanceled: 'Checkout was canceled. Your current plan remains unchanged.',
  hostWorkspaceTitle: 'Host workspace',
  hostWorkspaceHint: 'Subscription state, recent host activity, and tenant usage live here.',
  hostWorkspaceLoading: 'Loading workspace insights...',
  hostWorkspaceNoActivity: 'No recent host activity yet.',
  hostWorkspaceNoUsage: 'No tracked tenant usage yet for this period.',
  hostWorkspaceAnalyticsLocked: 'Analytics and host history unlock on Pro Host. Upgrade to view recent activity and usage trends.',
  hostWorkspaceAnalyticsTitle: 'Host momentum',
  hostWorkspaceAnalyticsHint: 'A repeat-host snapshot from recent runs, roster size, and reusable templates.',
  hostWorkspaceAnalyticsRecentRuns: 'Recent runs',
  hostWorkspaceAnalyticsCompletedRuns: 'Completed runs',
  hostWorkspaceAnalyticsAverageRoster: 'Avg roster',
  hostWorkspaceAnalyticsSavedTemplates: 'Saved templates',
  hostWorkspaceAnalyticsLiveRuns: 'Live runs',
  hostWorkspaceAnalyticsTopTopic: 'Top topic',
  hostWorkspaceAnalyticsLatestWinner: 'Latest winner',
  hostWorkspaceAnalyticsWinnerFallback: 'n/a',
  brandingEditorTitle: 'Branding',
  brandingEditorHint: 'Update the runtime app name, logo, and colors shown across host and player surfaces.',
  brandingLockedHint: 'Custom branding unlocks on Pro Host. Upgrade to apply your own app identity.',
  brandingRoleHint: 'Only owners and admins can update tenant branding.',
  brandingAppNameLabel: 'Brand app name',
  brandingLogoUrlLabel: 'Logo URL',
  brandingPrimaryColorLabel: 'Primary color',
  brandingSecondaryColorLabel: 'Secondary color',
  brandingSaveSubmit: 'Save branding',
  brandingSaving: 'Saving branding...',
  brandingSaved: 'Branding updated.',
  sessionTemplatesTitle: 'Session templates',
  sessionTemplatesHint: 'Save reusable host presets for recurring quiz events and relaunch them in one step.',
  sessionTemplatesLockedHint: 'Session templates unlock on Pro Host. Upgrade to save reusable event presets.',
  sessionTemplatesNameLabel: 'Template name',
  sessionTemplatesNamePlaceholder: 'Friday trivia default',
  sessionTemplatesSaveSubmit: 'Save current setup',
  sessionTemplatesSaving: 'Saving template...',
  sessionTemplatesSaved: 'Session template saved.',
  sessionTemplatesAppliedPrefix: 'Template applied:',
  sessionTemplatesDeleted: 'Session template deleted.',
  sessionTemplatesEmpty: 'No saved templates yet.',
  sessionTemplatesApplySubmit: 'Apply template',
  sessionTemplatesDeleteSubmit: 'Delete template',
  sessionTemplatesSaveFromHistorySubmit: 'Save as template',
  sessionTemplatesSavedFromHistoryPrefix: 'Session template saved from history:',
  hostedRuntimeBlocked: 'Hosted runtime is blocked until billing is restored. Upgrade or fix billing to launch sessions.',
  hostedRuntimePastDue: 'Billing is past due. Hosted launches are blocked until payment state is recovered.',
  hostedRuntimeCanceled: 'Subscription is canceled. Hosted launches are blocked until the tenant is upgraded again.',
  hostedPlayerCapPrefix: 'Hosted player cap:',
  hostedPlayerCapUpgrade: 'This plan allows fewer hosted players. Upgrade to launch larger sessions.',
  roomPanelTitle: 'Live room',
  roomPanelHint: 'Create a shareable room code for players, or join an existing room and resume it later on this device.',
  roomJoinLinkLabel: 'Player join link',
  roomDisplayNameLabel: 'Room display name',
  roomDisplayNamePlaceholder: 'Host or player name',
  roomCodeLabel: 'Room code',
  roomCodePlaceholder: 'ABC123',
  roomCreateSubmit: 'Create room',
  roomJoinSubmit: 'Join room',
  roomResumeSubmit: 'Resume room',
  roomClearSubmit: 'Clear saved room',
  roomPending: 'Working on room session...',
  roomCreatedPrefix: 'Room ready:',
  roomJoinedPrefix: 'Joined room:',
  roomResumedPrefix: 'Resumed room:',
  roomPlayersTitle: 'Players in room',
  roomNoPlayers: 'No players visible yet.',
  roomSavedHint: 'This room session is saved locally on this browser.',
  roomHostBadge: 'Host',
  roomPlayerBadge: 'Player',
  roomPlayerLobbyTitle: 'Player lobby',
  roomPlayerLobbyHint: 'Your browser is attached to this live room. Rejoin to refresh the roster or leave to switch rooms.',
  roomPlayerLobbyWaiting: 'Waiting for the host to launch or resume the live session.',
  roomPlayerLobbyRosterTitle: 'Players in this room',
  roomPlayerLobbySwitchHint: 'Leave this room before joining a different room code.',
  playerRouteTitle: 'Join live room',
  playerRouteHint: 'Enter your display name and join the host room from a dedicated player entry surface.',
  playerRouteDisplayNameLabel: 'Your display name',
  playerRouteJoinSubmit: 'Join room',
  playerRouteBackSubmit: 'Back to SmartIQ',
  playerRouteLoading: 'Loading room preview...',
  playerRoutePreviewPlayersPrefix: 'Players waiting:',
  playerRoutePreviewMissing: 'Room preview is not available yet. You can still try joining directly.',
  playerRouteInvalid: 'Player join link is invalid.',
  roomUsePlayersSubmit: 'Use room players',
  roomUseSelectedPlayersSubmit: 'Use selected players',
  roomStartLiveSubmit: 'Start with room',
  roomStartSelectedLiveSubmit: 'Start selected room',
  roomSelectAllPlayersSubmit: 'Select all',
  roomSelectedRosterTitle: 'Selected for launch',
  roomSelectedRosterEmpty: 'Select at least one room player for the live setup.',
  roomSelectedRosterReadyPrefix: 'Selected room roster ready:',
  roomSelectedRosterStartPrefix: 'Starting room roster:',
  roomUsePlayersMessage: 'Room players loaded into the live session setup.',
  recentHostedSessionsTitle: 'Recent hosted sessions',
  recentHostedSessionsEmpty: 'No hosted sessions launched yet.',
  recentHostedSessionPlayers: 'players',
  recentHostedSessionStatusLiveBadge: 'Live',
  recentHostedSessionStatusCompletedBadge: 'Completed',
  recentHostedSessionFilterAll: 'All',
  recentHostedSessionFilterLive: 'Live',
  recentHostedSessionFilterCompleted: 'Completed',
  recentHostedSessionTopicFallback: 'Any topic',
  recentHostedSessionApplySubmit: 'Duplicate setup',
  recentHostedSessionReviewSubmit: 'Review session',
  recentHostedSessionResumeSubmit: 'Resume live',
  recentHostedSessionLaunchSubmit: 'Launch duplicate',
  recentHostedSessionRefreshSubmit: 'Refresh review',
  recentHostedSessionPreparedPrefix: 'Duplicate setup ready:',
  recentHostedSessionReviewPrefix: 'Reviewing session:',
  recentHostedSessionReviewReadyPrefix: 'Session review ready:',
  recentHostedSessionResumePrefix: 'Resuming live session:',
  recentHostedSessionLaunchPrefix: 'Launching duplicate session:',
  recentHostedSessionUseRoomRoster: 'Using saved room roster for the duplicate launch.',
  recentHostedSessionUseReviewedRoster: 'Using reviewed session roster for the duplicate launch.',
  recentHostedSessionUsePlaceholderRoster: 'Using placeholder player slots from the previous hosted session.',
  recentHostedSessionReviewTitle: 'Session review',
  recentHostedSessionReviewEmpty: 'Pick a recent hosted session to review its latest saved state.',
  recentHostedSessionReviewQuestionFallback: 'No saved round question is available for this session yet.',
  recentHostedSessionReviewLastActionFallback: 'No saved host action yet.',
  recentHostedSessionNotesTitle: 'Follow-up note',
  recentHostedSessionNotesPlaceholder: 'What should change before the next run?',
  recentHostedSessionNotesSaveSubmit: 'Save note',
  recentHostedSessionNotesSaved: 'Follow-up note saved.',
  recentHostedSessionLeaderPrefix: 'Current leader:',
  recentHostedSessionStatusPrefix: 'Status:',
  recentHostedSessionStatusLive: 'Live',
  recentHostedSessionStatusCompleted: 'Completed',
  recentHostedSessionReviewError: 'Could not launch duplicate session from host history.',
  recentHostedSessionReviewLoadError: 'Could not load session review from host history.'
};
const GAME_STORAGE_KEY = 'smartiq.gameId';
const CONFIG_STORAGE_KEY = 'smartiq.roundConfig';
const ROOM_SESSION_STORAGE_KEY = 'smartiq.roomSession';
const ROOM_SELECTION_STORAGE_PREFIX = 'smartiq.roomSelection.';
const SESSION_REVIEW_NOTE_STORAGE_PREFIX = 'smartiq.sessionReviewNote.';
const STARTUP_PHASE = {
  LOADING: 'loading',
  BACKEND_UNREACHABLE: 'backend-unreachable',
  FORBIDDEN: 'forbidden',
  SERVER_ERROR: 'server-error',
  NOT_FOUND: 'not-found',
  TOPICS_EMPTY: 'topics-empty',
  READY: 'ready'
};
const SHOW_BUILD_BADGE = import.meta.env.DEV
  || String(import.meta.env.VITE_SHOW_BUILD_BADGE || '').toLowerCase() === 'true';
const BUILD_SHA = String(import.meta.env.VITE_BUILD_SHA || '').trim();

function isServerEngineEnabled() {
  const configured = String(import.meta.env.VITE_USE_SERVER_GAME_ENGINE || '').toLowerCase();
  const mode = String(import.meta.env.MODE || '').toLowerCase();
  if (mode === 'test') {
    return configured === 'true';
  }
  return true;
}

const DIFFICULTY_OPTIONS = [
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hard' }
];

const THEME_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'ember', label: 'Ember' },
  { value: 'ocean', label: 'Ocean' }
];

function normalizePlayerName(name) {
  return name.replace(/\s+/g, ' ').trim();
}

function isTestMode() {
  return String(import.meta.env.MODE || '').toLowerCase() === 'test';
}

function parsePlayers(text) {
  return Array.from(
    new Set(
      text
        .split(',')
        .map(normalizePlayerName)
        .filter(Boolean)
    )
  );
}

function isSupportedTheme(theme) {
  return THEME_OPTIONS.some((entry) => entry.value === theme);
}

function resolvePlanLimit(planCode) {
  const normalized = String(planCode || '').trim().toLowerCase();
  if (normalized.includes('starter')) return 1000;
  if (normalized.includes('pilot')) return 2000;
  if (normalized.includes('growth')) return 10000;
  return null;
}

function formatSubscriptionStatus(status) {
  const normalized = String(status || '').trim().toLowerCase();
  if (!normalized) {
    return 'Not configured';
  }
  return normalized.replace(/_/g, ' ');
}

function formatAuditAction(action) {
  const normalized = String(action || '').trim();
  if (!normalized) {
    return 'Tenant event';
  }
  return normalized.toLowerCase().replace(/_/g, ' ');
}

function resolveHostedRuntimeBlockMessage(subscription) {
  const normalizedStatus = String(subscription?.status || '').trim().toLowerCase();
  if (normalizedStatus === 'past_due') {
    return STRINGS.hostedRuntimePastDue;
  }
  if (normalizedStatus === 'canceled') {
    return STRINGS.hostedRuntimeCanceled;
  }
  return '';
}

function getRoomPlayerNames(roomSession) {
  const players = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [];
  return Array.from(new Set(players
    .map((player) => normalizePlayerName(player?.displayName || player?.playerId || ''))
    .filter(Boolean)));
}

function getSelectedRoomPlayerNames(roomSession, selectedPlayerNames) {
  const availablePlayers = getRoomPlayerNames(roomSession);
  if (!Array.isArray(selectedPlayerNames) || selectedPlayerNames.length === 0) {
    return availablePlayers;
  }
  const selectedSet = new Set(
    selectedPlayerNames
      .map((entry) => normalizePlayerName(String(entry || '')))
      .filter(Boolean)
  );
  const selectedPlayers = availablePlayers.filter((entry) => selectedSet.has(entry));
  return selectedPlayers.length > 0 ? selectedPlayers : availablePlayers;
}

function deriveRecentHostedSessions(auditEvents) {
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

function buildHostWorkspaceAnalytics(sessions, templateCount) {
  const normalizedSessions = Array.isArray(sessions) ? sessions : [];
  const playerCounts = normalizedSessions
    .map((entry) => (Number.isInteger(entry?.playerCount) ? entry.playerCount : null))
    .filter((value) => value != null);
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
    topTopic: topTopicEntry?.[0] || STRINGS.recentHostedSessionTopicFallback,
    latestWinner: latestWinner?.winnerDisplayName
      ? `${latestWinner.winnerDisplayName}${Number.isInteger(latestWinner.winnerScore) ? ` (${latestWinner.winnerScore} pts)` : ''}`
      : STRINGS.hostWorkspaceAnalyticsWinnerFallback,
    templateCount: Number.isInteger(templateCount) ? templateCount : 0
  };
}

function formatRecentHostedSessionPhase(phase) {
  const normalized = String(phase || '').trim().toLowerCase();
  if (!normalized) {
    return 'Unknown phase';
  }
  return normalized.replace(/_/g, ' ');
}

function buildRecentHostedSessionReview(snapshot, fallbackSession) {
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

function resolveRecentHostedSessionConfig(session, fallbackConfig, roomSession, reviewedSession) {
  const roomPlayerNames = getRoomPlayerNames(roomSession);
  const reviewedPlayerNames = reviewedSession?.gameId === session?.gameId && Array.isArray(reviewedSession?.scoreboard)
    ? reviewedSession.scoreboard
      .map((entry) => normalizePlayerName(entry?.displayName || entry?.playerId || ''))
      .filter(Boolean)
    : [];
  const placeholderPlayers = buildPlaceholderPlayers(session?.playerCount);
  const normalizedLanguage = String(session?.language || '').trim().toLowerCase();
  return {
    topic: String(session?.topic || '').trim(),
    lang: DEFAULT_LANGS.includes(normalizedLanguage) ? normalizedLanguage : fallbackConfig.lang,
    playersText: reviewedPlayerNames.length > 0
      ? reviewedPlayerNames.join(', ')
      : roomPlayerNames.length > 0
      ? roomPlayerNames.join(', ')
      : placeholderPlayers.length > 0
        ? placeholderPlayers.join(', ')
        : fallbackConfig.playersText
  };
}

function buildPlaceholderPlayers(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount <= 0) {
    return [];
  }
  return Array.from({ length: Math.min(playerCount, 10) }, (_, index) => `Player ${index + 1}`);
}

function buildBrandingDraft(brandingResponse) {
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

function buildRecentHostedSessionTemplateInput(review, session, fallbackTheme) {
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

function buildSessionTemplateDraft() {
  return {
    name: ''
  };
}

function readRuntimeSessionTemplates(settingsResponse) {
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

function resolvePlayerJoinRoute() {
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

function resolveBillingReturnState() {
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

function buildPlayerJoinUrl(roomCode) {
  const normalizedRoomCode = normalizeRoomCodeInput(roomCode);
  if (!normalizedRoomCode) {
    return '';
  }
  if (typeof window === 'undefined') {
    return `#/join/${normalizedRoomCode}`;
  }
  const url = new URL(window.location.href);
  url.hash = `/join/${normalizedRoomCode}`;
  return url.toString();
}

function SetupSkeleton({ appTitle }) {
  return (
    <section className="setup-panel board-surface" data-testid="setup-skeleton">
      <h1>{appTitle}</h1>
      <p>{STRINGS.loadingTopics}</p>
      <div className="topic-grid topic-grid--skeleton" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="topic-tile-skeleton" />
        ))}
      </div>
      <button disabled type="button">
        {STRINGS.startRound}
      </button>
    </section>
  );
}

function PublicLaunchPanel({ onStartTrial, onSignIn }) {
  return (
    <section className="setup-panel board-surface launch-panel" data-testid="launch-panel">
      <p className="section-title">{STRINGS.launchPanelEyebrow}</p>
      <div className="launch-panel-hero">
        <div className="launch-panel-copy">
          <h1>{STRINGS.launchPanelTitle}</h1>
          <p>{STRINGS.launchPanelHint}</p>
          <div className="launch-panel-actions">
            <button type="button" onClick={onStartTrial}>
              {STRINGS.launchPanelPrimaryCta}
            </button>
            <button type="button" className="secondary-action" onClick={onSignIn}>
              {STRINGS.launchPanelSecondaryCta}
            </button>
          </div>
        </div>
        <div className="launch-panel-pricing" aria-label={STRINGS.launchPanelPricingTitle}>
          <article className="launch-plan-card launch-plan-card--trial">
            <p>{STRINGS.launchPanelPricingTrial}</p>
            <strong>Start light</strong>
            <span>{STRINGS.launchPanelPricingTrialDetail}</span>
          </article>
          <article className="launch-plan-card launch-plan-card--pro">
            <p>{STRINGS.launchPanelPricingPro}</p>
            <strong>Recurring host default</strong>
            <span>{STRINGS.launchPanelPricingProDetail}</span>
          </article>
          <article className="launch-plan-card launch-plan-card--team">
            <p>{STRINGS.launchPanelPricingTeam}</p>
            <strong>Not the launch wedge</strong>
            <span>{STRINGS.launchPanelPricingTeamDetail}</span>
          </article>
        </div>
      </div>
      <div className="launch-panel-grid">
        <article className="launch-panel-card">
          <h2>{STRINGS.launchPanelValueTitle}</h2>
          <ul className="launch-panel-list">
            <li>{STRINGS.launchPanelValue1}</li>
            <li>{STRINGS.launchPanelValue2}</li>
            <li>{STRINGS.launchPanelValue3}</li>
          </ul>
        </article>
        <article className="launch-panel-card">
          <h2>{STRINGS.launchPanelAssuranceTitle}</h2>
          <ul className="launch-panel-list">
            <li>{STRINGS.launchPanelAssurance1}</li>
            <li>{STRINGS.launchPanelAssurance2}</li>
            <li>{STRINGS.launchPanelAssurance3}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

function BuildBadge() {
  if (!SHOW_BUILD_BADGE) {
    return null;
  }

  const badgeText = BUILD_SHA ? `DEV BUILD ${BUILD_SHA.slice(0, 7)}` : 'DEV BUILD';
  return (
    <p className="build-badge" data-testid="build-badge">
      {badgeText}
    </p>
  );
}

function AudioControls({ muted, volume, onToggleMute, onVolumeChange }) {
  return (
    <section className="audio-controls board-surface" data-testid="audio-controls" aria-label="Audio controls">
      <button
        type="button"
        className="audio-toggle"
        onClick={onToggleMute}
        aria-pressed={!muted}
      >
        {muted ? 'Muted' : 'Sound on'}
      </button>
      <label className="audio-volume-label" htmlFor="audio-volume-slider">
        Volume
      </label>
      <input
        id="audio-volume-slider"
        className="audio-volume-slider"
        type="range"
        min="0"
        max="100"
        step="5"
        value={Math.round(volume * 100)}
        onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        aria-label="Volume"
      />
    </section>
  );
}

function StartScreen({
  topics,
  config,
  setConfig,
  onStart,
  appTitle,
  runtimeSnapshot,
  runtimeWarning,
  onUpgrade,
  onLogout,
  upgradePending,
  upgradeMessage,
  checkoutUrl,
  workspaceInsights,
  workspacePending,
  workspaceError,
  hostLaunchBlocked,
  hostLaunchMessage,
  workspaceMessage,
  brandingDraft,
  brandingPending,
  brandingMessage,
  brandingError,
  sessionTemplates,
  sessionTemplateDraft,
  sessionTemplatePending,
  sessionTemplateMessage,
  sessionTemplateError,
  onBrandingDraftChange,
  onSaveBranding,
  onSessionTemplateDraftChange,
  onSaveSessionTemplate,
  onApplySessionTemplate,
  onDeleteSessionTemplate,
  reviewedHostedSession,
  reviewedHostedSessionNote,
  reviewedHostedSessionNoteMessage,
  onReviewedHostedSessionNoteChange,
  onSaveReviewedHostedSessionNote,
  activeHostedSession,
  hostedSessionFilter,
  onHostedSessionFilterChange,
  onUseRecentHostedSession,
  onReviewRecentHostedSession,
  onResumeRecentHostedSession,
  onLaunchRecentHostedSession,
  onSaveRecentHostedSessionAsTemplate,
  canLaunchRecentHostedSessions
}) {
  const [playerDraft, setPlayerDraft] = useState('');
  const players = parsePlayers(config.playersText);
  const draftPlayers = parsePlayers(playerDraft);
  const activeTopic = config.topic || 'Any Topic';
  const activeLanguage = String(config.lang || 'en').toUpperCase();
  const tenantId = runtimeSnapshot?.me?.selectedTenantId || '';
  const planCode = runtimeSnapshot?.subscription?.planCode || '';
  const planStatus = runtimeSnapshot?.subscription?.status || '';
  const capabilities = runtimeSnapshot?.capabilities || null;
  const planLimit = resolvePlanLimit(planCode);
  const maxHostedPlayers = Number.isInteger(capabilities?.maxHostedPlayers) ? capabilities.maxHostedPlayers : null;
  const analyticsHistoryEnabled = capabilities?.analyticsHistoryEnabled === true;
  const sessionTemplatesEnabled = capabilities?.sessionTemplatesEnabled === true;
  const customBrandingEnabled = capabilities?.customBrandingEnabled === true;
  const selectedRole = String(runtimeSnapshot?.me?.selectedRole || '').trim().toLowerCase();
  const canManageBrandingRole = selectedRole === 'owner' || selectedRole === 'admin';
  const canEditBranding = customBrandingEnabled && canManageBrandingRole;
  const mergedPlayerCount = Array.from(new Set([...players, ...draftPlayers])).length;
  const overHostedPlayerCap = maxHostedPlayers != null && mergedPlayerCount > maxHostedPlayers;
  const canStart = (players.length > 0 || draftPlayers.length > 0) && !overHostedPlayerCap;
  const usageRow = Array.isArray(workspaceInsights?.usageSummary)
    ? workspaceInsights.usageSummary.find((entry) => String(entry?.eventType || '').toLowerCase() === 'game.round.completed')
    : null;
  const canUpgrade = Boolean(tenantId) && typeof onUpgrade === 'function';
  const recentHostedSessions = deriveRecentHostedSessions(workspaceInsights?.auditEvents);
  const hostWorkspaceAnalytics = buildHostWorkspaceAnalytics(recentHostedSessions, sessionTemplates.length);
  const visibleHostedSessions = recentHostedSessions.filter((entry) => {
    if (hostedSessionFilter === 'completed') {
      return entry.status === 'completed';
    }
    if (hostedSessionFilter === 'live') {
      return entry.status !== 'completed';
    }
    return true;
  });

  function addPlayers(rawValue) {
    const incoming = parsePlayers(rawValue);
    if (incoming.length === 0) {
      return players;
    }
    const merged = Array.from(new Set([...players, ...incoming]));
    setConfig((prev) => ({ ...prev, playersText: merged.join(', ') }));
    return merged;
  }

  function removePlayer(player) {
    const next = players.filter((entry) => entry !== player);
    setConfig((prev) => ({ ...prev, playersText: next.join(', ') }));
  }

  function handleStartClick() {
    const merged = draftPlayers.length > 0 ? addPlayers(playerDraft) : players;
    const normalizedPlayers = Array.isArray(merged) ? merged : players;
    if (normalizedPlayers.length === 0) {
      return;
    }
    setPlayerDraft('');
    onStart(normalizedPlayers.join(', '));
  }

  function handleSaveTemplateClick() {
    if (typeof onSaveSessionTemplate !== 'function') {
      return;
    }
    const merged = draftPlayers.length > 0 ? addPlayers(playerDraft) : players;
    const normalizedPlayers = Array.isArray(merged) ? merged : players;
    if (normalizedPlayers.length === 0) {
      return;
    }
    setPlayerDraft('');
    onSaveSessionTemplate({
      name: sessionTemplateDraft.name,
      topic: config.topic,
      language: config.lang,
      theme: config.theme,
      players: normalizedPlayers
    });
  }

  return (
    <section className="setup-panel board-surface">
      <h1>{appTitle}</h1>
      <p>{STRINGS.subtitle}</p>
      {tenantId ? (
        <p className="field-hint tenant-runtime-hint" data-testid="tenant-runtime-hint">
          Tenant runtime active: {tenantId}{planCode ? ` | plan ${planCode}` : ''}
        </p>
      ) : null}
      {runtimeWarning ? (
        <p className="field-hint runtime-warning" data-testid="tenant-runtime-warning">{runtimeWarning}</p>
      ) : null}
      {tenantId ? (
        <section className="host-workspace board-surface" data-testid="host-workspace-panel">
          <div className="host-workspace-header">
            <div>
              <h2>{STRINGS.hostWorkspaceTitle}</h2>
              <p>{STRINGS.hostWorkspaceHint}</p>
            </div>
            <div className="host-plan-chip">
              <span>{planCode || 'trial'}</span>
              <strong>{formatSubscriptionStatus(planStatus)}</strong>
            </div>
          </div>
          {workspacePending ? <p className="field-hint">{STRINGS.hostWorkspaceLoading}</p> : null}
          {hostLaunchBlocked ? (
            <p className="error" data-testid="host-launch-blocked">{hostLaunchMessage || STRINGS.hostedRuntimeBlocked}</p>
          ) : null}
          {workspaceError ? (
            <p className="error" data-testid="workspace-error">{workspaceError}</p>
          ) : null}
          {workspaceMessage ? (
            <p className="field-hint" data-testid="workspace-message">{workspaceMessage}</p>
          ) : null}
          <div className="host-workspace-grid">
            <section className="host-workspace-card">
              <h3>Plan</h3>
              <p className="field-hint">Billing cycle: {runtimeSnapshot?.subscription?.billingCycle || 'not set'}</p>
              <p className="field-hint">{STRINGS.hostedPlayerCapPrefix} {maxHostedPlayers == null ? 'not mapped yet' : maxHostedPlayers}</p>
              <p className="field-hint">Usage cap: {planLimit == null ? 'unbounded / not mapped yet' : `${planLimit} tracked events / period`}</p>
              <p className="field-hint">
                Round usage: {!analyticsHistoryEnabled ? STRINGS.hostWorkspaceAnalyticsLocked : usageRow ? `${usageRow.totalValue} across ${usageRow.eventCount} events` : STRINGS.hostWorkspaceNoUsage}
              </p>
            </section>
            <section className="host-workspace-card" data-testid="host-workspace-analytics-card">
              <h3>{STRINGS.hostWorkspaceAnalyticsTitle}</h3>
              <p className="field-hint">
                {!analyticsHistoryEnabled ? STRINGS.hostWorkspaceAnalyticsLocked : STRINGS.hostWorkspaceAnalyticsHint}
              </p>
              {!analyticsHistoryEnabled ? (
                <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsLocked}</p>
              ) : (
                <>
                  <div className="host-analytics-metric-grid">
                    <article className="host-analytics-metric">
                      <span>{STRINGS.hostWorkspaceAnalyticsRecentRuns}</span>
                      <strong>{hostWorkspaceAnalytics.totalSessions}</strong>
                    </article>
                    <article className="host-analytics-metric">
                      <span>{STRINGS.hostWorkspaceAnalyticsCompletedRuns}</span>
                      <strong>{hostWorkspaceAnalytics.completedSessions}</strong>
                    </article>
                    <article className="host-analytics-metric">
                      <span>{STRINGS.hostWorkspaceAnalyticsAverageRoster}</span>
                      <strong>{hostWorkspaceAnalytics.averagePlayers == null ? 'n/a' : hostWorkspaceAnalytics.averagePlayers}</strong>
                    </article>
                    <article className="host-analytics-metric">
                      <span>{STRINGS.hostWorkspaceAnalyticsSavedTemplates}</span>
                      <strong>{hostWorkspaceAnalytics.templateCount}</strong>
                    </article>
                  </div>
                  <div className="host-analytics-summary-list">
                    <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsLiveRuns}: {hostWorkspaceAnalytics.liveSessions}</p>
                    <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsTopTopic}: {hostWorkspaceAnalytics.topTopic}</p>
                    <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsLatestWinner}: {hostWorkspaceAnalytics.latestWinner}</p>
                  </div>
                </>
              )}
            </section>
            <section className="host-workspace-card" data-testid="branding-editor-card">
              <h3>{STRINGS.brandingEditorTitle}</h3>
              <p className="field-hint">
                {customBrandingEnabled ? STRINGS.brandingEditorHint : STRINGS.brandingLockedHint}
              </p>
              <div className="branding-preview">
                <strong>{brandingDraft.appName || appTitle}</strong>
                <div className="branding-swatch-row" aria-hidden>
                  <span className="branding-swatch" style={{ backgroundColor: brandingDraft.primaryColor }} />
                  <span className="branding-swatch" style={{ backgroundColor: brandingDraft.secondaryColor }} />
                </div>
              </div>
              {!customBrandingEnabled ? (
                <div className="branding-locked-state" data-testid="branding-locked">
                  <p className="field-hint">{STRINGS.brandingLockedHint}</p>
                  {canUpgrade ? (
                    <button type="button" className="secondary-action" onClick={onUpgrade} disabled={upgradePending}>
                      {upgradePending ? STRINGS.upgradeSubmitting : STRINGS.upgradeSubmit}
                    </button>
                  ) : null}
                </div>
              ) : !canManageBrandingRole ? (
                <p className="field-hint" data-testid="branding-role-hint">{STRINGS.brandingRoleHint}</p>
              ) : (
                <>
                  <div className="branding-form-grid">
                    <label htmlFor="branding-app-name">{STRINGS.brandingAppNameLabel}</label>
                    <input
                      id="branding-app-name"
                      type="text"
                      value={brandingDraft.appName}
                      onChange={(event) => onBrandingDraftChange('appName', event.target.value)}
                      disabled={brandingPending}
                    />
                    <label htmlFor="branding-logo-url">{STRINGS.brandingLogoUrlLabel}</label>
                    <input
                      id="branding-logo-url"
                      type="text"
                      value={brandingDraft.logoUrl}
                      onChange={(event) => onBrandingDraftChange('logoUrl', event.target.value)}
                      disabled={brandingPending}
                    />
                    <label htmlFor="branding-primary-color">{STRINGS.brandingPrimaryColorLabel}</label>
                    <input
                      id="branding-primary-color"
                      type="text"
                      value={brandingDraft.primaryColor}
                      onChange={(event) => onBrandingDraftChange('primaryColor', event.target.value)}
                      disabled={brandingPending}
                    />
                    <label htmlFor="branding-secondary-color">{STRINGS.brandingSecondaryColorLabel}</label>
                    <input
                      id="branding-secondary-color"
                      type="text"
                      value={brandingDraft.secondaryColor}
                      onChange={(event) => onBrandingDraftChange('secondaryColor', event.target.value)}
                      disabled={brandingPending}
                    />
                  </div>
                  <div className="host-session-actions">
                    <button type="button" onClick={onSaveBranding} disabled={brandingPending}>
                      {brandingPending ? STRINGS.brandingSaving : STRINGS.brandingSaveSubmit}
                    </button>
                  </div>
                </>
              )}
              {brandingMessage ? <p className="field-hint" data-testid="branding-message">{brandingMessage}</p> : null}
              {brandingError ? <p className="error" data-testid="branding-error">{brandingError}</p> : null}
            </section>
            <section className="host-workspace-card" data-testid="session-templates-card">
              <h3>{STRINGS.sessionTemplatesTitle}</h3>
              <p className="field-hint">
                {sessionTemplatesEnabled ? STRINGS.sessionTemplatesHint : STRINGS.sessionTemplatesLockedHint}
              </p>
              {!sessionTemplatesEnabled ? (
                <div className="branding-locked-state" data-testid="session-templates-locked">
                  <p className="field-hint">{STRINGS.sessionTemplatesLockedHint}</p>
                  {canUpgrade ? (
                    <button type="button" className="secondary-action" onClick={onUpgrade} disabled={upgradePending}>
                      {upgradePending ? STRINGS.upgradeSubmitting : STRINGS.upgradeSubmit}
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="branding-form-grid">
                    <label htmlFor="session-template-name">{STRINGS.sessionTemplatesNameLabel}</label>
                    <input
                      id="session-template-name"
                      type="text"
                      placeholder={STRINGS.sessionTemplatesNamePlaceholder}
                      value={sessionTemplateDraft.name}
                      onChange={(event) => onSessionTemplateDraftChange(event.target.value)}
                      disabled={sessionTemplatePending}
                    />
                  </div>
                  <div className="host-session-actions">
                    <button
                      type="button"
                      onClick={handleSaveTemplateClick}
                      disabled={sessionTemplatePending || !sessionTemplateDraft.name.trim() || (players.length === 0 && draftPlayers.length === 0)}
                    >
                      {sessionTemplatePending ? STRINGS.sessionTemplatesSaving : STRINGS.sessionTemplatesSaveSubmit}
                    </button>
                  </div>
                  {sessionTemplates.length > 0 ? (
                    <ul className="host-activity-list session-template-list">
                      {sessionTemplates.map((template) => (
                        <li key={template.templateId}>
                          <strong>{template.name}</strong>
                          <span>
                            {(template.topic || STRINGS.recentHostedSessionTopicFallback)}
                            {template.language ? ` | ${template.language.toUpperCase()}` : ''}
                            {template.theme ? ` | ${template.theme}` : ''}
                            {template.players.length > 0 ? ` | ${template.players.length} ${STRINGS.recentHostedSessionPlayers}` : ''}
                          </span>
                          <span className="session-template-players">{template.players.join(', ')}</span>
                          <div className="host-session-actions">
                            <button type="button" onClick={() => onApplySessionTemplate(template)}>
                              {STRINGS.sessionTemplatesApplySubmit}
                            </button>
                            <button
                              type="button"
                              className="secondary-action"
                              onClick={() => onDeleteSessionTemplate(template)}
                              disabled={sessionTemplatePending}
                            >
                              {STRINGS.sessionTemplatesDeleteSubmit}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="field-hint">{STRINGS.sessionTemplatesEmpty}</p>
                  )}
                </>
              )}
              {sessionTemplateMessage ? <p className="field-hint" data-testid="session-template-message">{sessionTemplateMessage}</p> : null}
              {sessionTemplateError ? <p className="error" data-testid="session-template-error">{sessionTemplateError}</p> : null}
            </section>
            <section className="host-workspace-card">
              <h3>Recent activity</h3>
              {!analyticsHistoryEnabled ? (
                <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsLocked}</p>
              ) : Array.isArray(workspaceInsights?.auditEvents) && workspaceInsights.auditEvents.length > 0 ? (
                <ul className="host-activity-list">
                  {workspaceInsights.auditEvents.slice(0, 5).map((entry) => (
                    <li key={entry.auditEventId || `${entry.action}-${entry.eventTime}`}>
                      <strong>{formatAuditAction(entry.action)}</strong>
                      <span>{entry.entityId || entry.metadata?.roomCode || entry.metadata?.gameId || 'tenant'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                !workspacePending ? <p className="field-hint">{STRINGS.hostWorkspaceNoActivity}</p> : null
              )}
            </section>
            <section className="host-workspace-card">
              <h3>{STRINGS.recentHostedSessionsTitle}</h3>
              <div className="host-session-filter-row" role="tablist" aria-label="Hosted session filter">
                {[
                  { value: 'all', label: STRINGS.recentHostedSessionFilterAll },
                  { value: 'live', label: STRINGS.recentHostedSessionFilterLive },
                  { value: 'completed', label: STRINGS.recentHostedSessionFilterCompleted }
                ].map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    className={`session-filter-chip${hostedSessionFilter === entry.value ? ' selected' : ''}`}
                    aria-pressed={hostedSessionFilter === entry.value}
                    onClick={() => onHostedSessionFilterChange(entry.value)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              {!analyticsHistoryEnabled ? (
                <p className="field-hint">{STRINGS.hostWorkspaceAnalyticsLocked}</p>
              ) : visibleHostedSessions.length > 0 ? (
                <ul className="host-activity-list">
                  {visibleHostedSessions.map((entry) => (
                    <li
                      key={entry.gameId}
                      className={activeHostedSession?.gameId === entry.gameId ? 'selected' : ''}
                    >
                      <strong>
                        {entry.topic || STRINGS.recentHostedSessionTopicFallback}
                        <span className={`session-status-badge${entry.status === 'completed' ? ' is-completed' : ''}`}>
                          {entry.status === 'completed'
                            ? STRINGS.recentHostedSessionStatusCompletedBadge
                            : STRINGS.recentHostedSessionStatusLiveBadge}
                        </span>
                      </strong>
                      <span>
                        {entry.gameId}
                        {entry.language ? ` | ${entry.language.toUpperCase()}` : ''}
                        {entry.playerCount != null ? ` | ${entry.playerCount} ${STRINGS.recentHostedSessionPlayers}` : ''}
                        {entry.winnerDisplayName ? ` | winner ${entry.winnerDisplayName}` : ''}
                      </span>
                      {typeof onUseRecentHostedSession === 'function' ? (
                        <div className="host-session-actions">
                          <button type="button" onClick={() => onUseRecentHostedSession(entry)}>
                            {STRINGS.recentHostedSessionApplySubmit}
                          </button>
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => onReviewRecentHostedSession(entry)}
                            disabled={!entry.gameId}
                          >
                            {STRINGS.recentHostedSessionReviewSubmit}
                          </button>
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => onResumeRecentHostedSession(entry)}
                            disabled={!entry.gameId || hostLaunchBlocked}
                          >
                            {STRINGS.recentHostedSessionResumeSubmit}
                          </button>
                          <button
                            type="button"
                            className="secondary-action"
                            onClick={() => onLaunchRecentHostedSession(entry)}
                            disabled={!canLaunchRecentHostedSessions(entry)}
                          >
                            {STRINGS.recentHostedSessionLaunchSubmit}
                          </button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                !workspacePending ? <p className="field-hint">{STRINGS.recentHostedSessionsEmpty}</p> : null
              )}
            </section>
            <section className="host-workspace-card recent-hosted-session-review" data-testid="recent-hosted-session-review">
              <h3>{STRINGS.recentHostedSessionReviewTitle}</h3>
              {reviewedHostedSession ? (
                <>
                  <strong>{reviewedHostedSession.topic || STRINGS.recentHostedSessionTopicFallback}</strong>
                  <p className="field-hint">
                    {reviewedHostedSession.gameId}
                    {reviewedHostedSession.language ? ` | ${reviewedHostedSession.language.toUpperCase()}` : ''}
                    {` | round ${reviewedHostedSession.roundNumber}`}
                    {` | ${reviewedHostedSession.phase}`}
                  </p>
                  <p className="recent-session-question">
                    {reviewedHostedSession.question || STRINGS.recentHostedSessionReviewQuestionFallback}
                  </p>
                  <p className="field-hint">
                    Last action: {reviewedHostedSession.lastAction || STRINGS.recentHostedSessionReviewLastActionFallback}
                  </p>
                  <div className="recent-session-meta-grid">
                    <p className="field-hint">
                      {STRINGS.recentHostedSessionStatusPrefix} {reviewedHostedSession.isCompleted ? STRINGS.recentHostedSessionStatusCompleted : STRINGS.recentHostedSessionStatusLive}
                    </p>
                    <p className="field-hint">
                      {STRINGS.recentHostedSessionLeaderPrefix} {reviewedHostedSession.leaderDisplayName || 'n/a'}{reviewedHostedSession.leaderDisplayName ? ` (${reviewedHostedSession.leaderScore} pts)` : ''}
                    </p>
                  </div>
                  {activeHostedSession ? (
                    <div className="host-session-actions host-session-actions--detail">
                      <button type="button" onClick={() => onUseRecentHostedSession(activeHostedSession)}>
                        {STRINGS.recentHostedSessionApplySubmit}
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => onReviewRecentHostedSession(activeHostedSession)}
                      >
                        {STRINGS.recentHostedSessionRefreshSubmit}
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => onResumeRecentHostedSession(activeHostedSession)}
                        disabled={hostLaunchBlocked}
                      >
                        {STRINGS.recentHostedSessionResumeSubmit}
                      </button>
                      <button
                        type="button"
                        className="secondary-action"
                        onClick={() => onLaunchRecentHostedSession(activeHostedSession)}
                        disabled={!canLaunchRecentHostedSessions(activeHostedSession)}
                      >
                        {STRINGS.recentHostedSessionLaunchSubmit}
                      </button>
                      {sessionTemplatesEnabled && typeof onSaveRecentHostedSessionAsTemplate === 'function' ? (
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onSaveRecentHostedSessionAsTemplate(activeHostedSession)}
                          disabled={sessionTemplatePending}
                        >
                          {STRINGS.sessionTemplatesSaveFromHistorySubmit}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <ul className="recent-session-scoreboard">
                    {reviewedHostedSession.scoreboard.map((entry) => (
                      <li key={entry.playerId || entry.displayName}>
                        <strong>{entry.displayName}</strong>
                        <span>{entry.score} pts</span>
                      </li>
                    ))}
                  </ul>
                  <div className="recent-session-note-editor">
                    <label htmlFor="recent-session-note">{STRINGS.recentHostedSessionNotesTitle}</label>
                    <textarea
                      id="recent-session-note"
                      rows="3"
                      value={reviewedHostedSessionNote}
                      onChange={(event) => onReviewedHostedSessionNoteChange(event.target.value)}
                      placeholder={STRINGS.recentHostedSessionNotesPlaceholder}
                    />
                    <div className="host-session-actions host-session-actions--detail">
                      <button type="button" onClick={onSaveReviewedHostedSessionNote}>
                        {STRINGS.recentHostedSessionNotesSaveSubmit}
                      </button>
                    </div>
                    {reviewedHostedSessionNoteMessage ? (
                      <p className="field-hint" data-testid="recent-session-note-message">{reviewedHostedSessionNoteMessage}</p>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="field-hint">{STRINGS.recentHostedSessionReviewEmpty}</p>
              )}
            </section>
          </div>
        </section>
      ) : null}
      {tenantId && typeof onLogout === 'function' ? (
        <div className="upgrade-row">
          <button type="button" onClick={onLogout}>
            {STRINGS.signOutSubmit}
          </button>
        </div>
      ) : null}
      {canUpgrade ? (
        <div className="upgrade-row">
          <button type="button" onClick={onUpgrade} disabled={upgradePending}>
            {upgradePending ? STRINGS.upgradeSubmitting : hostLaunchBlocked ? STRINGS.upgradeRecoverySubmit : STRINGS.upgradeSubmit}
          </button>
          {upgradeMessage ? <p className="field-hint" data-testid="upgrade-message">{upgradeMessage}</p> : null}
          {checkoutUrl ? (
            <a className="inline-link" data-testid="checkout-link" href={checkoutUrl}>
              {STRINGS.upgradeContinueSubmit}
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="setup-toolbar">
        <div className="setup-toolbar-group">
          <label htmlFor="theme">Theme</label>
          <select
            id="theme"
            value={config.theme}
            onChange={(event) => setConfig((prev) => ({ ...prev, theme: event.target.value }))}
          >
            {THEME_OPTIONS.map((theme) => (
              <option key={theme.value} value={theme.value}>
                {theme.label}
              </option>
            ))}
          </select>
        </div>
        <div className="setup-toolbar-group">
          <label htmlFor="lang">Language</label>
          <select
            id="lang"
            value={config.lang}
            onChange={(event) => setConfig((prev) => ({ ...prev, lang: event.target.value }))}
          >
            {DEFAULT_LANGS.map((lang) => (
              <option key={lang} value={lang}>
                {lang.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <h2 className="section-title">Topic</h2>
      <div className="topic-grid" role="radiogroup" aria-label="Topic options">
        <button
          type="button"
          className={`topic-tile${config.topic === '' ? ' selected' : ''}`}
          onClick={() => setConfig((prev) => ({ ...prev, topic: '' }))}
          aria-pressed={config.topic === ''}
        >
          <span className="topic-title">Any Topic</span>
          <span className="topic-count">Random deck</span>
        </button>
        {topics.map((topic) => {
          const selected = config.topic === topic.topic;
          return (
            <button
              key={topic.topic}
              type="button"
              className={`topic-tile${selected ? ' selected' : ''}`}
              onClick={() => setConfig((prev) => ({ ...prev, topic: topic.topic }))}
              aria-pressed={selected}
            >
              <span className="topic-title">{topic.topic}</span>
              <span className="topic-count">{topic.count} Q</span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Difficulty</h2>
      <div className="difficulty-pills" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTY_OPTIONS.map((entry) => {
          const selected = config.difficulty === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              className={`pill${selected ? ' selected' : ''}`}
              onClick={() => setConfig((prev) => ({ ...prev, difficulty: entry.value }))}
              aria-pressed={selected}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
      <p className="field-hint active-filter" data-testid="active-filter">
        Active filter: {activeTopic} | {activeLanguage}
      </p>

      <label htmlFor="players">Players</label>
      <input
        id="players"
        type="text"
        value={playerDraft}
        onChange={(event) => setPlayerDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addPlayers(event.currentTarget.value);
            setPlayerDraft('');
          }
        }}
        onBlur={(event) => {
          addPlayers(event.currentTarget.value);
          setPlayerDraft('');
        }}
        placeholder={STRINGS.playersPlaceholder}
      />
      <div className="players-chips">
        {players.map((player) => (
          <button key={player} className="player-token" type="button" onClick={() => removePlayer(player)}>
            <span>{player}</span>
            <span aria-hidden>x</span>
          </button>
        ))}
      </div>
      {overHostedPlayerCap ? (
        <p className="field-hint runtime-warning" data-testid="host-player-cap-warning">
          {STRINGS.hostedPlayerCapUpgrade} {STRINGS.hostedPlayerCapPrefix} {maxHostedPlayers}.
        </p>
      ) : null}
      {players.length === 0 ? <p className="field-hint">{STRINGS.addPlayerHint}</p> : null}

      <button className="start-cta" onClick={handleStartClick} disabled={!canStart || hostLaunchBlocked} type="button">
        {STRINGS.startRound}
      </button>
    </section>
  );
}

function OnboardingPanel({
  draft,
  pending,
  success,
  error,
  onDraftChange,
  onSubmit,
  workspaceInputRef
}) {
  return (
    <section className="setup-panel board-surface onboarding-panel" data-testid="onboarding-panel">
      <h2>{STRINGS.onboardingTitle}</h2>
      <p>{STRINGS.onboardingHint}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="onboarding-workspace">{STRINGS.onboardingWorkspaceLabel}</label>
        <input
          id="onboarding-workspace"
          ref={workspaceInputRef}
          type="text"
          value={draft.workspaceName}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, workspaceName: event.target.value }))}
          placeholder={STRINGS.onboardingWorkspacePlaceholder}
          autoComplete="organization"
          disabled={pending}
        />

        <label htmlFor="onboarding-email">{STRINGS.onboardingEmailLabel}</label>
        <input
          id="onboarding-email"
          type="email"
          value={draft.ownerEmail}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, ownerEmail: event.target.value }))}
          placeholder={STRINGS.onboardingEmailPlaceholder}
          autoComplete="email"
          disabled={pending}
        />

        <label htmlFor="onboarding-display-name">{STRINGS.onboardingNameLabel}</label>
        <input
          id="onboarding-display-name"
          type="text"
          value={draft.ownerDisplayName}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, ownerDisplayName: event.target.value }))}
          placeholder={STRINGS.onboardingNamePlaceholder}
          autoComplete="name"
          disabled={pending}
        />

        <button type="submit" disabled={pending}>
          {pending ? STRINGS.onboardingSubmitting : STRINGS.onboardingSubmit}
        </button>
      </form>

      {success ? <p className="field-hint" data-testid="onboarding-success">{STRINGS.onboardingSuccess}</p> : null}
      {error ? <p className="error" data-testid="onboarding-error">{error}</p> : null}
    </section>
  );
}

function SignInPanel({
  draft,
  pending,
  success,
  error,
  onDraftChange,
  onSubmit,
  emailInputRef
}) {
  return (
    <section className="setup-panel board-surface onboarding-panel" data-testid="signin-panel">
      <h2>{STRINGS.signInTitle}</h2>
      <p>{STRINGS.signInHint}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="signin-email">{STRINGS.signInEmailLabel}</label>
        <input
          id="signin-email"
          ref={emailInputRef}
          type="email"
          value={draft.email}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, email: event.target.value }))}
          placeholder={STRINGS.signInEmailPlaceholder}
          autoComplete="email"
          disabled={pending}
        />

        <label htmlFor="signin-tenant-id">{STRINGS.signInTenantLabel}</label>
        <input
          id="signin-tenant-id"
          type="text"
          value={draft.tenantId}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, tenantId: event.target.value }))}
          placeholder={STRINGS.signInTenantPlaceholder}
          autoComplete="off"
          disabled={pending}
        />

        <button type="submit" disabled={pending}>
          {pending ? STRINGS.signInSubmitting : STRINGS.signInSubmit}
        </button>
      </form>

      {success ? <p className="field-hint" data-testid="signin-success">{success}</p> : null}
      {error ? <p className="error" data-testid="signin-error">{error}</p> : null}
    </section>
  );
}

function RoomPanel({
  appTitle,
  draft,
  pending,
  message,
  error,
  roomSession,
  selectedRoomPlayerNames,
  onDraftChange,
  onCreateRoom,
  onJoinRoom,
  onResumeRoom,
  onClearRoom,
  onSelectAllRoomPlayers,
  onToggleRoomPlayer,
  onUseRoomPlayers,
  onStartRoomSession
}) {
  const roomPlayers = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [];
  const roomPlayerNames = getRoomPlayerNames(roomSession);
  const selectedPlayers = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
  const canUseRoomPlayers = roomSession?.role === 'host' && roomPlayerNames.length > 0;
  const isPlayerLobby = roomSession?.role === 'player';
  const roomBranding = roomSession?.roomState?.branding && typeof roomSession.roomState.branding === 'object'
    ? roomSession.roomState.branding
    : null;
  const playerLobbyAppTitle = String(roomBranding?.appName || appTitle || STRINGS.title).trim() || STRINGS.title;
  const playerLobbyStyle = roomBranding?.primaryColor || roomBranding?.secondaryColor
    ? {
      '--player-lobby-accent': roomBranding?.primaryColor || undefined,
      '--player-lobby-accent-2': roomBranding?.secondaryColor || roomBranding?.primaryColor || undefined
    }
    : undefined;
  const playerJoinLink = roomSession?.roomCode ? buildPlayerJoinUrl(roomSession.roomCode) : '';

  return (
    <section className="setup-panel board-surface room-panel" data-testid="room-panel">
      <h2>{STRINGS.roomPanelTitle}</h2>
      <p>{isPlayerLobby ? STRINGS.roomPlayerLobbyHint : STRINGS.roomPanelHint}</p>

      {pending ? <p className="field-hint">{STRINGS.roomPending}</p> : null}
      {message ? <p className="field-hint" data-testid="room-message">{message}</p> : null}
      {error ? <p className="error" data-testid="room-error">{error}</p> : null}

      {isPlayerLobby ? (
        <div className="player-lobby-card" data-testid="player-lobby-panel" style={playerLobbyStyle}>
          <div className="player-lobby-hero">
            <p className="player-lobby-brand">{playerLobbyAppTitle}</p>
            <div>
              <h3>{STRINGS.roomPlayerLobbyTitle}</h3>
              <p>{STRINGS.roomPlayerLobbyWaiting}</p>
            </div>
            <span className="host-plan-chip room-role-chip">
              <span>{STRINGS.roomPlayerBadge}</span>
              <strong>{roomSession.displayName || roomSession.playerId}</strong>
            </span>
          </div>
          <div className="player-lobby-meta">
            <strong>{roomSession.roomCode}</strong>
            <span>{STRINGS.roomSavedHint}</span>
          </div>
          <div className="room-actions">
            <button type="button" onClick={onResumeRoom} disabled={pending}>
              {STRINGS.roomResumeSubmit}
            </button>
            <button type="button" className="secondary-action" onClick={onClearRoom} disabled={pending}>
              {STRINGS.roomClearSubmit}
            </button>
          </div>
          <div className="room-player-list">
            <h3>{STRINGS.roomPlayerLobbyRosterTitle}</h3>
            {roomPlayers.length > 0 ? (
              <ul>
                {roomPlayers.map((player) => (
                  <li key={player.playerId || player.displayName}>
                    <strong>{player.displayName || player.playerId}</strong>
                    <span>{player.playerId}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-hint">{STRINGS.roomNoPlayers}</p>
            )}
          </div>
          <p className="field-hint">{STRINGS.roomPlayerLobbySwitchHint}</p>
        </div>
      ) : (
        <>
          <label htmlFor="room-display-name">{STRINGS.roomDisplayNameLabel}</label>
          <input
            id="room-display-name"
            type="text"
            value={draft.displayName}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, displayName: event.target.value }))}
            placeholder={STRINGS.roomDisplayNamePlaceholder}
            autoComplete="nickname"
            disabled={pending}
          />

          <label htmlFor="room-code">{STRINGS.roomCodeLabel}</label>
          <input
            id="room-code"
            type="text"
            value={draft.roomCode}
            onChange={(event) => onDraftChange((prev) => ({ ...prev, roomCode: normalizeRoomCodeInput(event.target.value) }))}
            placeholder={STRINGS.roomCodePlaceholder}
            autoComplete="off"
            disabled={pending}
          />

          <div className="room-actions">
            <button type="button" onClick={onCreateRoom} disabled={pending}>
              {STRINGS.roomCreateSubmit}
            </button>
            <button type="button" onClick={onJoinRoom} disabled={pending}>
              {STRINGS.roomJoinSubmit}
            </button>
            {roomSession ? (
              <>
                <button type="button" onClick={onResumeRoom} disabled={pending}>
                  {STRINGS.roomResumeSubmit}
                </button>
                <button type="button" className="secondary-action" onClick={onClearRoom} disabled={pending}>
                  {STRINGS.roomClearSubmit}
                </button>
              </>
            ) : null}
          </div>
        </>
      )}

      {roomSession && !isPlayerLobby ? (
        <div className="room-session-card" data-testid="room-session-card">
          <div className="room-session-header">
            <div>
              <strong>{roomSession.roomCode}</strong>
              <span className="field-hint">{STRINGS.roomSavedHint}</span>
            </div>
            <span className="host-plan-chip room-role-chip">
              <span>{roomSession.role === 'host' ? STRINGS.roomHostBadge : STRINGS.roomPlayerBadge}</span>
              <strong>{roomSession.displayName || roomSession.playerId}</strong>
            </span>
          </div>
          <div className="room-player-list">
            <h3>{STRINGS.roomPlayersTitle}</h3>
            {roomSession?.role === 'host' && playerJoinLink ? (
              <p className="field-hint">
                {STRINGS.roomJoinLinkLabel}:{' '}
                <a className="inline-link" href={playerJoinLink}>
                  {playerJoinLink}
                </a>
              </p>
            ) : null}
            {canUseRoomPlayers ? (
              <>
                <div className="room-actions">
                  <button type="button" onClick={onSelectAllRoomPlayers} disabled={pending}>
                    {STRINGS.roomSelectAllPlayersSubmit}
                  </button>
                  <button type="button" onClick={onUseRoomPlayers} disabled={pending || selectedPlayers.length === 0}>
                    {STRINGS.roomUseSelectedPlayersSubmit}
                  </button>
                  <button type="button" onClick={onStartRoomSession} disabled={pending || selectedPlayers.length === 0}>
                    {STRINGS.roomStartSelectedLiveSubmit}
                  </button>
                </div>
                <p className="field-hint" data-testid="room-selected-roster-hint">
                  {STRINGS.roomSelectedRosterTitle}: {selectedPlayers.length > 0 ? selectedPlayers.join(', ') : STRINGS.roomSelectedRosterEmpty}
                </p>
              </>
            ) : null}
            {roomPlayers.length > 0 ? (
              <ul>
                {roomPlayers.map((player) => (
                  <li key={player.playerId || player.displayName}>
                    <strong>{player.displayName || player.playerId}</strong>
                    <span>{player.playerId}</span>
                    {canUseRoomPlayers ? (
                      <label className="room-player-toggle">
                        <input
                          type="checkbox"
                          checked={selectedPlayers.includes(normalizePlayerName(player.displayName || player.playerId || ''))}
                          onChange={() => onToggleRoomPlayer(normalizePlayerName(player.displayName || player.playerId || ''))}
                        />
                        <span>Include in launch</span>
                      </label>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="field-hint">{STRINGS.roomNoPlayers}</p>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function PlayerJoinRoutePanel({
  roomCode,
  appTitle,
  preview,
  pending,
  message,
  error,
  displayName,
  onDisplayNameChange,
  onJoin,
  onBack
}) {
  const previewBranding = preview?.branding && typeof preview.branding === 'object' ? preview.branding : null;
  const previewPlayers = Array.isArray(preview?.players) ? preview.players : [];
  const previewTitle = String(previewBranding?.appName || appTitle || STRINGS.title).trim() || STRINGS.title;
  const previewStyle = previewBranding?.primaryColor || previewBranding?.secondaryColor
    ? {
      '--player-lobby-accent': previewBranding?.primaryColor || undefined,
      '--player-lobby-accent-2': previewBranding?.secondaryColor || previewBranding?.primaryColor || undefined
    }
    : undefined;

  return (
    <section className="setup-panel board-surface player-route-panel" data-testid="player-route-panel" style={previewStyle}>
      <p className="player-lobby-brand">{previewTitle}</p>
      <h1>{STRINGS.playerRouteTitle}</h1>
      <p>{STRINGS.playerRouteHint}</p>
      <p className="field-hint">
        {STRINGS.roomCodeLabel}: <strong>{roomCode}</strong>
      </p>
      {pending ? <p className="field-hint">{STRINGS.playerRouteLoading}</p> : null}
      {message ? <p className="field-hint" data-testid="player-route-message">{message}</p> : null}
      {error ? <p className="error" data-testid="player-route-error">{error}</p> : null}
      <label htmlFor="player-route-display-name">{STRINGS.playerRouteDisplayNameLabel}</label>
      <input
        id="player-route-display-name"
        type="text"
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        placeholder={STRINGS.roomDisplayNamePlaceholder}
        autoComplete="nickname"
        disabled={pending}
      />
      <div className="room-actions">
        <button type="button" onClick={onJoin} disabled={pending}>
          {STRINGS.playerRouteJoinSubmit}
        </button>
        <button type="button" className="secondary-action" onClick={onBack} disabled={pending}>
          {STRINGS.playerRouteBackSubmit}
        </button>
      </div>
      {preview ? (
        <div className="player-route-preview" data-testid="player-route-preview">
          <p className="field-hint">
            {STRINGS.playerRoutePreviewPlayersPrefix} {previewPlayers.length}
          </p>
          {previewPlayers.length > 0 ? (
            <ul className="recent-session-scoreboard">
              {previewPlayers.map((player) => (
                <li key={player.playerId || player.displayName}>
                  <strong>{player.displayName || player.playerId}</strong>
                  <span>{player.playerId}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="field-hint">{STRINGS.playerRoutePreviewMissing}</p>
          )}
        </div>
      ) : (
        <p className="field-hint">{STRINGS.playerRoutePreviewMissing}</p>
      )}
    </section>
  );
}

function loadStoredConfig() {
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

function StartupStatePanel({ startup, onRetry, appTitle }) {
  if (startup.phase === STARTUP_PHASE.READY) {
    return null;
  }

  if (startup.phase === STARTUP_PHASE.LOADING) {
    return <SetupSkeleton appTitle={appTitle} />;
  }

  if (startup.phase === STARTUP_PHASE.TOPICS_EMPTY) {
    return (
      <section className="setup-panel board-surface startup-panel">
        <h1>{appTitle}</h1>
        <p className="error">{STRINGS.noTopics}</p>
        <p>{STRINGS.noTopicsHint}</p>
        <button type="button" onClick={onRetry}>
          {STRINGS.retry}
        </button>
      </section>
    );
  }

  return (
    <section className="setup-panel board-surface startup-panel">
      <h1>{appTitle}</h1>
      <div className="error-panel">
        <p className="error">{startup.error?.title ?? 'Could not load topics.'}</p>
        <p>{startup.error?.detail}</p>
      </div>
      <button type="button" onClick={onRetry}>
        {STRINGS.retry}
      </button>
      <p className="startup-hint">
        {STRINGS.checkBackendUrl} <code>{API_BASE || '(missing VITE_API_BASE_URL)'}</code>
      </p>
      {API_BASE ? (
        <a className="inline-link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">
          {STRINGS.openHealth}
        </a>
      ) : null}
    </section>
  );
}

function isDeckExhaustedMessage(message) {
  const normalized = String(message || '').toLowerCase();
  return normalized.includes('no playable cards for this filter')
    || normalized.includes('question bank is empty for this filter');
}

function loadStoredRoomSession() {
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

function buildRoomSelectionStorageKey(roomCode) {
  const normalized = normalizeRoomCodeInput(String(roomCode || ''));
  return normalized ? `${ROOM_SELECTION_STORAGE_PREFIX}${normalized}` : '';
}

function loadStoredRoomSelection(roomCode) {
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
    return parsed
      .map((entry) => normalizePlayerName(String(entry || '')))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function buildSessionReviewNoteStorageKey(gameId) {
  const normalized = String(gameId || '').trim();
  return normalized ? `${SESSION_REVIEW_NOTE_STORAGE_PREFIX}${normalized}` : '';
}

function loadSessionReviewNote(gameId) {
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

function persistSessionReviewNote(gameId, note) {
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

function persistRoomSession(session) {
  if (!session) {
    localStorage.removeItem(ROOM_SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(ROOM_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function persistRoomSelection(roomCode, selectedPlayerNames) {
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

function normalizeRoomCodeInput(value) {
  return String(value || '').trim().toUpperCase();
}

function isAdminConsoleRoute() {
  if (typeof window === 'undefined') {
    return false;
  }
  const pathname = window.location?.pathname || '';
  const hash = window.location?.hash || '';
  return pathname.startsWith('/admin') || hash.startsWith('#/admin');
}

function GameApp() {
  const storedConfig = loadStoredConfig();
  const storedRoomSession = loadStoredRoomSession();
  const [playerJoinRoute, setPlayerJoinRoute] = useState(resolvePlayerJoinRoute());
  const billingReturnState = resolveBillingReturnState();
  const [playerRoutePreview, setPlayerRoutePreview] = useState(null);
  const [playerRoutePending, setPlayerRoutePending] = useState(false);
  const [playerRouteError, setPlayerRouteError] = useState('');
  const [playerRouteMessage, setPlayerRouteMessage] = useState('');
  const [playerRouteDisplayName, setPlayerRouteDisplayName] = useState('');
  const [topics, setTopics] = useState([]);
  const [startup, setStartup] = useState({
    phase: STARTUP_PHASE.LOADING,
    error: null
  });
  const [config, setConfig] = useState({
    topic: storedConfig?.topic ?? '',
    difficulty: storedConfig?.difficulty ?? '2',
    lang: storedConfig?.lang ?? 'en',
    theme: storedConfig?.theme ?? 'classic',
    playersText: storedConfig?.playersText ?? ''
  });
  const [gameId, setGameId] = useState('');
  const [cardError, setCardError] = useState('');
  const [runtimeMode, setRuntimeMode] = useState('local');
  const [runtimeSnapshot, setRuntimeSnapshot] = useState(null);
  const [runtimeWarning, setRuntimeWarning] = useState('');
  const [onboardingDraft, setOnboardingDraft] = useState({
    workspaceName: '',
    ownerEmail: '',
    ownerDisplayName: ''
  });
  const [signInDraft, setSignInDraft] = useState({
    email: '',
    tenantId: ''
  });
  const [onboardingPending, setOnboardingPending] = useState(false);
  const [onboardingError, setOnboardingError] = useState('');
  const [onboardingSuccess, setOnboardingSuccess] = useState(false);
  const [signInPending, setSignInPending] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [signInSuccess, setSignInSuccess] = useState('');
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [brandingDraft, setBrandingDraft] = useState(buildBrandingDraft(null));
  const [brandingPending, setBrandingPending] = useState(false);
  const [brandingMessage, setBrandingMessage] = useState('');
  const [brandingError, setBrandingError] = useState('');
  const [sessionTemplates, setSessionTemplates] = useState([]);
  const [sessionTemplateDraft, setSessionTemplateDraft] = useState(buildSessionTemplateDraft());
  const [sessionTemplatePending, setSessionTemplatePending] = useState(false);
  const [sessionTemplateMessage, setSessionTemplateMessage] = useState('');
  const [sessionTemplateError, setSessionTemplateError] = useState('');
  const [workspaceInsights, setWorkspaceInsights] = useState({
    auditEvents: [],
    usageSummary: []
  });
  const [workspacePending, setWorkspacePending] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState('');
  const [workspaceError, setWorkspaceError] = useState('');
  const [reviewedHostedSession, setReviewedHostedSession] = useState(null);
  const [reviewedHostedSessionNote, setReviewedHostedSessionNote] = useState('');
  const [reviewedHostedSessionNoteMessage, setReviewedHostedSessionNoteMessage] = useState('');
  const [activeHostedSession, setActiveHostedSession] = useState(null);
  const [hostedSessionFilter, setHostedSessionFilter] = useState('all');
  const [roomDraft, setRoomDraft] = useState({
    displayName: storedRoomSession?.displayName || '',
    roomCode: storedRoomSession?.roomCode || ''
  });
  const [roomPending, setRoomPending] = useState(false);
  const [roomMessage, setRoomMessage] = useState('');
  const [roomError, setRoomError] = useState('');
  const [roomSession, setRoomSession] = useState(storedRoomSession);
  const [selectedRoomPlayerNames, setSelectedRoomPlayerNames] = useState(() => getRoomPlayerNames(storedRoomSession));

  const legacyEngine = useGameEngine(30);
  const serverEngine = useServerGameEngine(30);
  const engine = runtimeMode === 'server' ? serverEngine : legacyEngine;
  const {
    phase: legacyPhase,
    loadTicket: legacyLoadTicket,
    cardLoaded: legacyCardLoaded,
    cardLoadFailed: legacyCardLoadFailed
  } = legacyEngine;

  const {
    muted: audioMuted,
    volume: audioVolume,
    setVolume: setAudioVolume,
    toggleMute: toggleAudioMute,
    playRoundIntro,
    playCorrect,
    playWrong
  } = useAudioFeedback();
  const lastAudioCardRef = useRef('');
  const lastRevealedCountRef = useRef(0);
  const lastWrongCountRef = useRef(0);
  const billingReturnHandledRef = useRef(false);
  const onboardingWorkspaceInputRef = useRef(null);
  const signInEmailInputRef = useRef(null);
  const activePlayerRouteRoomCode = String(playerJoinRoute || '').trim();
  const playerRouteMatchesSavedPlayerSession = roomSession?.role === 'player'
    && normalizeRoomCodeInput(roomSession?.roomCode) === activePlayerRouteRoomCode;
  const canLaunchRecentHostedSessions = useCallback((session) => {
    if (String(session?.gameId || '').trim()) {
      return true;
    }
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    return parsePlayers(nextConfig.playersText).length > 0;
  }, [config, roomSession, reviewedHostedSession]);

  const focusOnboardingWorkspace = useCallback(() => {
    const input = onboardingWorkspaceInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (typeof input.scrollIntoView === 'function') {
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  const focusSignInEmail = useCallback(() => {
    const input = signInEmailInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (typeof input.scrollIntoView === 'function') {
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  const loadTopics = useCallback(async () => {
    setStartup({
      phase: STARTUP_PHASE.LOADING,
      error: null
    });

    try {
      const data = await fetchTopics();
      setTopics(data);
      if (data.length > 0) {
        setStartup({
          phase: STARTUP_PHASE.READY,
          error: null
        });
        setConfig((prev) => {
          const topicExists = data.some((entry) => entry.topic === prev.topic);
          return { ...prev, topic: topicExists ? prev.topic : '' };
        });
        return;
      }

      setStartup({
        phase: STARTUP_PHASE.TOPICS_EMPTY,
        error: null
      });
    } catch (error) {
      const resolved = resolveTopicsErrorState(error);
      setStartup({
        phase:
          resolved.kind === 'forbidden'
            ? STARTUP_PHASE.FORBIDDEN
            : resolved.kind === 'server-error'
              ? STARTUP_PHASE.SERVER_ERROR
              : resolved.kind === 'not-found'
                ? STARTUP_PHASE.NOT_FOUND
              : STARTUP_PHASE.BACKEND_UNREACHABLE,
        error: resolved
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    function handleHashChange() {
      setPlayerJoinRoute(resolvePlayerJoinRoute());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const roomPlayerNames = getRoomPlayerNames(roomSession);
    if (roomPlayerNames.length === 0) {
      setSelectedRoomPlayerNames([]);
      return;
    }
    const storedSelection = loadStoredRoomSelection(roomSession?.roomCode);
    setSelectedRoomPlayerNames((prev) => {
      const baseline = storedSelection.length > 0 ? storedSelection : prev;
      const next = roomPlayerNames.filter((entry) => baseline.includes(entry));
      return next.length > 0 ? next : roomPlayerNames;
    });
  }, [roomSession]);

  useEffect(() => {
    if (!reviewedHostedSession?.gameId) {
      setReviewedHostedSessionNote('');
      setReviewedHostedSessionNoteMessage('');
      return;
    }
    setReviewedHostedSessionNote(loadSessionReviewNote(reviewedHostedSession.gameId));
    setReviewedHostedSessionNoteMessage('');
  }, [reviewedHostedSession]);

  useEffect(() => {
    if (roomSession?.role !== 'host' || !roomSession?.roomCode) {
      return;
    }
    persistRoomSelection(roomSession.roomCode, selectedRoomPlayerNames);
  }, [roomSession, selectedRoomPlayerNames]);

  useEffect(() => {
    loadTopics();

    const savedGameId = localStorage.getItem(GAME_STORAGE_KEY);
    if (savedGameId) {
      setGameId(savedGameId);
      return;
    }

    const generated = globalThis.crypto?.randomUUID?.() || `game-${Date.now()}`;
    localStorage.setItem(GAME_STORAGE_KEY, generated);
    setGameId(generated);
  }, [loadTopics]);

  useEffect(() => {
    if (!activePlayerRouteRoomCode) {
      setPlayerRoutePreview(null);
      setPlayerRoutePending(false);
      setPlayerRouteError('');
      setPlayerRouteMessage('');
      return;
    }
    let cancelled = false;
    setPlayerRoutePending(true);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
    fetchRoomPreview(activePlayerRouteRoomCode)
      .then((preview) => {
        if (!cancelled) {
          setPlayerRoutePreview(preview);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
            ? error.detail
            : error?.message || STRINGS.playerRouteInvalid;
          setPlayerRouteError(detail);
          setPlayerRoutePreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPlayerRoutePending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activePlayerRouteRoomCode]);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme);
  }, [config.theme]);

  const applyRuntimeSnapshot = useCallback((snapshot) => {
    if (!snapshot) {
      return;
    }
    setRuntimeSnapshot(snapshot);
    setBrandingDraft(buildBrandingDraft(snapshot?.branding));
    setSessionTemplates(readRuntimeSessionTemplates(snapshot?.settings));
    const runtimeTheme = snapshot?.settings?.settings?.theme;
    if (isSupportedTheme(runtimeTheme)) {
      setConfig((prev) => ({ ...prev, theme: runtimeTheme }));
    }
    const primaryColor = snapshot?.branding?.branding?.primaryColor;
    const secondaryColor = snapshot?.branding?.branding?.secondaryColor;
    if (primaryColor) {
      document.documentElement.style.setProperty('--accent', primaryColor);
    }
    if (secondaryColor) {
      document.documentElement.style.setProperty('--accent2', secondaryColor);
    }
  }, []);

  const clearRuntimeSession = useCallback((message = '') => {
    clearRuntimeAuthContext();
    setRuntimeSnapshot(null);
    setRuntimeWarning(message);
    setCheckoutMessage('');
    setBrandingPending(false);
    setBrandingMessage('');
    setBrandingError('');
    setBrandingDraft(buildBrandingDraft(null));
    setSessionTemplates([]);
    setSessionTemplateDraft(buildSessionTemplateDraft());
    setSessionTemplatePending(false);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
    setWorkspacePending(false);
    setReviewedHostedSession(null);
    setActiveHostedSession(null);
    setHostedSessionFilter('all');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent2');
  }, []);

  const applyRoomSession = useCallback((nextSession, message = '') => {
    setRoomSession(nextSession);
    persistRoomSession(nextSession);
    setRoomMessage(message);
    setRoomError('');
    if (nextSession?.displayName || nextSession?.roomCode) {
      setRoomDraft((prev) => ({
        ...prev,
        displayName: nextSession?.displayName || prev.displayName,
        roomCode: nextSession?.roomCode || prev.roomCode
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRuntimeSnapshot() {
      if (typeof hasRuntimeAuthContext !== 'function' || !hasRuntimeAuthContext()) {
        return;
      }
      if (typeof fetchTenantRuntimeSnapshot !== 'function') {
        return;
      }
      try {
        const snapshot = await fetchTenantRuntimeSnapshot();
        if (cancelled || !snapshot) {
          return;
        }
        applyRuntimeSnapshot(snapshot);
      } catch (error) {
        if (!cancelled) {
          if (error?.code === 'INVALID_AUTH_CONTEXT' || error?.code === 'UNAUTHENTICATED' || error?.status === 401) {
            clearRuntimeSession(STRINGS.sessionExpired);
          } else {
            setRuntimeWarning('Tenant runtime context not available; using local defaults.');
          }
        }
      }
    }

    loadRuntimeSnapshot();
    return () => {
      cancelled = true;
    };
  }, [applyRuntimeSnapshot, clearRuntimeSession]);

  async function applyRuntimeAuthAndSnapshot(runtimeAuth) {
    setRuntimeAuthContext(runtimeAuth || null);
    const snapshot = await fetchTenantRuntimeSnapshot();
    applyRuntimeSnapshot(snapshot);
  }

  const refreshWorkspaceInsights = useCallback(async () => {
    if (!runtimeSnapshot?.me?.selectedTenantId) {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
      setWorkspacePending(false);
      return;
    }
    if (runtimeSnapshot?.capabilities?.analyticsHistoryEnabled !== true) {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
      setWorkspacePending(false);
      return;
    }

    setWorkspacePending(true);
    try {
      const [auditEvents, usageSummary] = await Promise.all([
        fetchTenantAuditEvents({ limit: 8 }),
        fetchTenantUsageSummary({ eventType: 'game.round.completed' })
      ]);
      setWorkspaceInsights({
        auditEvents: Array.isArray(auditEvents) ? auditEvents : [],
        usageSummary: Array.isArray(usageSummary) ? usageSummary : []
      });
    } catch {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
    } finally {
      setWorkspacePending(false);
    }
  }, [runtimeSnapshot]);

  useEffect(() => {
    if (!runtimeSnapshot?.me?.selectedTenantId || runtimeSnapshot?.capabilities?.analyticsHistoryEnabled !== true) {
      setWorkspaceInsights({ auditEvents: [], usageSummary: [] });
      setWorkspacePending(false);
      return;
    }
    refreshWorkspaceInsights();
  }, [refreshWorkspaceInsights, runtimeSnapshot]);

  useEffect(() => {
    if (billingReturnHandledRef.current || !billingReturnState) {
      return undefined;
    }
    if (typeof hasRuntimeAuthContext !== 'function' || !hasRuntimeAuthContext()) {
      return undefined;
    }
    billingReturnHandledRef.current = true;
    let cancelled = false;

    async function syncBillingReturn() {
      if (billingReturnState === 'cancel') {
        if (!cancelled) {
          setCheckoutMessage(STRINGS.billingReturnCanceled);
        }
        return;
      }
      if (billingReturnState !== 'success' || typeof fetchTenantRuntimeSnapshot !== 'function') {
        return;
      }

      if (!cancelled) {
        setCheckoutMessage(STRINGS.billingReturnRefreshing);
      }

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const snapshot = await fetchTenantRuntimeSnapshot();
        if (cancelled || !snapshot) {
          return;
        }
        applyRuntimeSnapshot(snapshot);
        const subscriptionStatus = String(snapshot?.subscription?.status || '').trim().toLowerCase();
        const capabilities = snapshot?.capabilities || null;
        const entitlementsActive = subscriptionStatus === 'active'
          || capabilities?.analyticsHistoryEnabled === true
          || capabilities?.customBrandingEnabled === true
          || (Number.isInteger(capabilities?.maxHostedPlayers) && capabilities.maxHostedPlayers > 4);
        if (entitlementsActive) {
          if (!cancelled) {
            setCheckoutMessage(STRINGS.billingReturnRestored);
          }
          return;
        }
        if (attempt < 2) {
          await new Promise((resolve) => {
            setTimeout(resolve, 350);
          });
        }
      }

      if (!cancelled) {
        setCheckoutMessage(STRINGS.billingReturnPending);
      }
    }

    syncBillingReturn();
    return () => {
      cancelled = true;
    };
  }, [applyRuntimeSnapshot, billingReturnState]);

  async function handleOnboardingBootstrap() {
    if (onboardingPending) {
      return;
    }
    setOnboardingPending(true);
    setOnboardingError('');
    setOnboardingSuccess(false);
    setRuntimeWarning('');

    try {
      const response = await bootstrapOnboardingTenant(onboardingDraft);
      const runtimeAuth = response?.runtimeAuth;
      await applyRuntimeAuthAndSnapshot(runtimeAuth);
      setOnboardingSuccess(true);
      setSignInSuccess('');
      setOnboardingDraft({
        workspaceName: '',
        ownerEmail: '',
        ownerDisplayName: ''
      });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not bootstrap onboarding workspace.';
      setOnboardingError(detail);
    } finally {
      setOnboardingPending(false);
    }
  }

  async function handleSignIn() {
    if (signInPending) {
      return;
    }
    setSignInPending(true);
    setSignInError('');
    setSignInSuccess('');
    setRuntimeWarning('');

    try {
      const requestResponse = await requestRuntimeAuthLink(signInDraft);
      const challengeToken = String(requestResponse?.challengeToken || '').trim();
      if (!challengeToken) {
        throw new Error('Sign-in link delivery is not available in this environment.');
      }
      const completeResponse = await completeRuntimeAuth({ challengeToken });
      await applyRuntimeAuthAndSnapshot(completeResponse?.runtimeAuth || null);
      setSignInSuccess(STRINGS.signInSuccess);
      setOnboardingSuccess(false);
      setSignInDraft({ email: '', tenantId: '' });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not restore host session.';
      setSignInError(detail);
    } finally {
      setSignInPending(false);
    }
  }

  async function handleLogout() {
    try {
      if (typeof logoutRuntimeAuth === 'function') {
        await logoutRuntimeAuth();
      }
    } catch {
      // stateless runtime logout is best-effort
    } finally {
      clearRuntimeSession(STRINGS.signOutSuccess);
      setSignInSuccess('');
      setOnboardingSuccess(false);
    }
  }

  async function handleUpgradeCheckout() {
    if (checkoutPending) {
      return;
    }
    setCheckoutPending(true);
    setCheckoutMessage('');
    setCheckoutUrl('');
    try {
      const response = await initiateCheckoutSession({
        planCode: 'pilot-monthly',
        billingCycle: 'monthly'
      });
      const sessionId = String(response?.checkoutSessionId || '').trim();
      const nextCheckoutUrl = String(response?.checkoutUrl || '').trim();
      setCheckoutUrl(nextCheckoutUrl);
      if (nextCheckoutUrl && !isTestMode() && typeof window !== 'undefined' && window.location && typeof window.location.assign === 'function') {
        setCheckoutMessage(STRINGS.upgradeRedirecting);
        window.location.assign(nextCheckoutUrl);
        return;
      }
      if (sessionId) {
        setCheckoutMessage(`${STRINGS.upgradeSuccessPrefix} ${sessionId}${nextCheckoutUrl ? ` | ${STRINGS.upgradeRecoveryHint}` : ''}`);
      } else {
        setCheckoutMessage(STRINGS.upgradeSuccessPrefix);
      }
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.upgradeErrorFallback;
      setCheckoutMessage(detail);
    } finally {
      setCheckoutPending(false);
    }
  }

  function handleBrandingDraftChange(field, value) {
    setBrandingDraft((prev) => ({
      ...prev,
      [field]: value
    }));
    setBrandingMessage('');
    setBrandingError('');
  }

  async function handleSaveBranding() {
    if (brandingPending || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setBrandingPending(true);
    setBrandingMessage('');
    setBrandingError('');
    try {
      const branding = await updateRuntimeTenantBranding(brandingDraft);
      if (runtimeSnapshot) {
        applyRuntimeSnapshot({
          ...runtimeSnapshot,
          branding
        });
      }
      setBrandingMessage(STRINGS.brandingSaved);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not update tenant branding.';
      setBrandingError(detail);
    } finally {
      setBrandingPending(false);
    }
  }

  function handleSessionTemplateDraftChange(value) {
    setSessionTemplateDraft({ name: value });
    setSessionTemplateMessage('');
    setSessionTemplateError('');
  }

  async function handleSaveSessionTemplate(templateInput) {
    if (sessionTemplatePending || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setSessionTemplatePending(true);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    try {
      const response = await upsertRuntimeSessionTemplate(
        globalThis.crypto?.randomUUID?.() || `template-${Date.now()}`,
        templateInput
      );
      setSessionTemplates(Array.isArray(response?.templates) ? response.templates : []);
      setSessionTemplateDraft(buildSessionTemplateDraft());
      setSessionTemplateMessage(STRINGS.sessionTemplatesSaved);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not save session template.';
      setSessionTemplateError(detail);
    } finally {
      setSessionTemplatePending(false);
    }
  }

  function handleApplySessionTemplate(template) {
    setConfig((prev) => ({
      ...prev,
      topic: template?.topic || '',
      lang: DEFAULT_LANGS.includes(String(template?.language || '').trim().toLowerCase())
        ? String(template.language).trim().toLowerCase()
        : prev.lang,
      theme: isSupportedTheme(template?.theme) ? template.theme : prev.theme,
      playersText: Array.isArray(template?.players) ? template.players.join(', ') : prev.playersText
    }));
    setSessionTemplateMessage(`${STRINGS.sessionTemplatesAppliedPrefix} ${template?.name || ''}`.trim());
    setSessionTemplateError('');
  }

  async function handleSaveRecentHostedSessionAsTemplate(session) {
    const templateInput = buildRecentHostedSessionTemplateInput(reviewedHostedSession, session, config.theme);
    if (!templateInput.name || templateInput.players.length === 0) {
      setSessionTemplateError('Could not derive a reusable template from this hosted session.');
      return;
    }
    await handleSaveSessionTemplate(templateInput);
    setSessionTemplateMessage(`${STRINGS.sessionTemplatesSavedFromHistoryPrefix} ${templateInput.name}`);
  }

  function handleReviewedHostedSessionNoteChange(value) {
    setReviewedHostedSessionNote(value);
    setReviewedHostedSessionNoteMessage('');
  }

  function handleSaveReviewedHostedSessionNote() {
    if (!reviewedHostedSession?.gameId) {
      return;
    }
    persistSessionReviewNote(reviewedHostedSession.gameId, reviewedHostedSessionNote);
    setReviewedHostedSessionNoteMessage(STRINGS.recentHostedSessionNotesSaved);
  }

  async function handleDeleteSessionTemplate(template) {
    const templateId = String(template?.templateId || '').trim();
    if (sessionTemplatePending || !templateId || !runtimeSnapshot?.me?.selectedTenantId) {
      return;
    }
    setSessionTemplatePending(true);
    setSessionTemplateMessage('');
    setSessionTemplateError('');
    try {
      const response = await deleteRuntimeSessionTemplate(templateId);
      setSessionTemplates(Array.isArray(response?.templates) ? response.templates : []);
      setSessionTemplateMessage(STRINGS.sessionTemplatesDeleted);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not delete session template.';
      setSessionTemplateError(detail);
    } finally {
      setSessionTemplatePending(false);
    }
  }

  async function handleCreateRoom() {
    if (roomPending) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const fallbackDisplayName = runtimeSnapshot?.me?.displayName
        || onboardingDraft.ownerDisplayName
        || 'Host';
      const displayName = String(roomDraft.displayName || fallbackDisplayName).trim();
      const created = await createRoomSession({ displayName });
      const resumed = await rejoinRoomSession(created.roomCode, {
        playerId: created.playerId,
        authToken: created.authToken
      });
      applyRoomSession({
        roomCode: resumed.roomCode,
        playerId: resumed.playerId,
        authToken: resumed.authToken,
        displayName,
        role: 'host',
        roomState: resumed.roomState
      }, `${STRINGS.roomCreatedPrefix} ${resumed.roomCode}`);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not create room.';
      setRoomError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  async function handleJoinRoom() {
    if (roomPending) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const roomCode = normalizeRoomCodeInput(roomDraft.roomCode);
      const displayName = String(roomDraft.displayName || 'Player').trim() || 'Player';
      const joined = await joinRoomSession(roomCode, { displayName });
      const resumed = await rejoinRoomSession(joined.roomCode, {
        playerId: joined.playerId,
        authToken: joined.authToken
      });
      applyRoomSession({
        roomCode: resumed.roomCode,
        playerId: resumed.playerId,
        authToken: resumed.authToken,
        displayName,
        role: 'player',
        roomState: resumed.roomState
      }, `${STRINGS.roomJoinedPrefix} ${resumed.roomCode}`);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not join room.';
      setRoomError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  async function handlePlayerRouteJoin() {
    if (!activePlayerRouteRoomCode || roomPending) {
      return;
    }
    setRoomPending(true);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
    try {
      const displayName = String(playerRouteDisplayName || roomDraft.displayName || 'Player').trim() || 'Player';
      const joined = await joinRoomSession(activePlayerRouteRoomCode, { displayName });
      const resumed = await rejoinRoomSession(joined.roomCode, {
        playerId: joined.playerId,
        authToken: joined.authToken
      });
      applyRoomSession({
        roomCode: resumed.roomCode,
        playerId: resumed.playerId,
        authToken: resumed.authToken,
        displayName,
        role: 'player',
        roomState: resumed.roomState
      }, `${STRINGS.roomJoinedPrefix} ${resumed.roomCode}`);
      setPlayerRouteMessage(`${STRINGS.roomJoinedPrefix} ${resumed.roomCode}`);
      setPlayerRoutePreview(resumed.roomState || null);
      setRoomDraft((prev) => ({ ...prev, roomCode: resumed.roomCode, displayName }));
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not join room.';
      setPlayerRouteError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  function handleExitPlayerRoute() {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    setPlayerJoinRoute(null);
    setPlayerRoutePreview(null);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
  }

  async function handleResumeRoom() {
    if (roomPending || !roomSession?.roomCode || !roomSession?.playerId || !roomSession?.authToken) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const resumed = await rejoinRoomSession(roomSession.roomCode, {
        playerId: roomSession.playerId,
        authToken: roomSession.authToken
      });
      applyRoomSession({
        ...roomSession,
        roomCode: resumed.roomCode,
        playerId: resumed.playerId,
        authToken: resumed.authToken,
        roomState: resumed.roomState
      }, `${STRINGS.roomResumedPrefix} ${resumed.roomCode}`);
    } catch (error) {
      persistRoomSession(null);
      setRoomSession(null);
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not resume room.';
      setRoomError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  function handleClearRoom() {
    persistRoomSelection(roomSession?.roomCode, []);
    setRoomSession(null);
    persistRoomSession(null);
    setSelectedRoomPlayerNames([]);
    setRoomMessage('');
    setRoomError('');
  }

  function handleSelectAllRoomPlayers() {
    setSelectedRoomPlayerNames(getRoomPlayerNames(roomSession));
    setRoomError('');
  }

  function handleToggleRoomPlayer(playerName) {
    const normalized = normalizePlayerName(String(playerName || ''));
    if (!normalized) {
      return;
    }
    setSelectedRoomPlayerNames((prev) => (
      prev.includes(normalized)
        ? prev.filter((entry) => entry !== normalized)
        : [...prev, normalized]
    ));
    setRoomError('');
  }

  function handleUseRoomPlayers() {
    const roomPlayerNames = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
    if (roomPlayerNames.length === 0) {
      setRoomError(STRINGS.roomSelectedRosterEmpty);
      return;
    }
    setConfig((prev) => ({
      ...prev,
      playersText: roomPlayerNames.join(', ')
    }));
    setRoomMessage(`${STRINGS.roomSelectedRosterReadyPrefix} ${roomPlayerNames.join(', ')}`);
    setRoomError('');
  }

  function handleStartRoomSession() {
    const roomPlayerNames = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
    if (roomPlayerNames.length === 0) {
      setRoomError(STRINGS.roomSelectedRosterEmpty);
      return;
    }
    setConfig((prev) => ({
      ...prev,
      playersText: roomPlayerNames.join(', ')
    }));
    setRoomMessage(`${STRINGS.roomSelectedRosterStartPrefix} ${roomPlayerNames.join(', ')}`);
    launchRound({
      playersText: roomPlayerNames.join(', '),
      topic: config.topic,
      language: config.lang
    });
  }

  function handleUseRecentHostedSession(session) {
    setActiveHostedSession(session || null);
    setWorkspaceError('');
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    setConfig((prev) => ({
      ...prev,
      topic: nextConfig.topic,
      lang: nextConfig.lang,
      playersText: nextConfig.playersText
    }));
    const messageParts = [
      `${STRINGS.recentHostedSessionPreparedPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`,
      nextConfig.lang ? nextConfig.lang.toUpperCase() : String(config.lang || 'en').toUpperCase()
    ];
    if (reviewedHostedSession?.gameId === session?.gameId && Array.isArray(reviewedHostedSession?.scoreboard) && reviewedHostedSession.scoreboard.length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUseReviewedRoster);
    } else if (getRoomPlayerNames(roomSession).length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUseRoomRoster);
    } else if (buildPlaceholderPlayers(session?.playerCount).length > 0) {
      messageParts.push(STRINGS.recentHostedSessionUsePlaceholderRoster);
    }
    setWorkspaceMessage(messageParts.join(' | '));
  }

  async function handleReviewRecentHostedSession(session) {
    const gameIdToReview = String(session?.gameId || '').trim();
    if (!gameIdToReview) {
      setWorkspaceError(STRINGS.recentHostedSessionReviewLoadError);
      return;
    }

    setActiveHostedSession(session || null);
    setWorkspaceError('');
    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionReviewPrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    try {
      const snapshot = await fetchServerGameSession(gameIdToReview);
      setReviewedHostedSession(buildRecentHostedSessionReview(snapshot, session));
      setWorkspaceMessage(`${STRINGS.recentHostedSessionReviewReadyPrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.recentHostedSessionReviewLoadError;
      setWorkspaceError(detail);
    } finally {
      setWorkspacePending(false);
    }
  }

  async function handleResumeRecentHostedSession(session) {
    const gameIdToResume = String(session?.gameId || '').trim();
    if (!gameIdToResume) {
      setWorkspaceError(STRINGS.recentHostedSessionReviewLoadError);
      return;
    }

    setActiveHostedSession(session || null);
    setWorkspaceError('');
    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionResumePrefix} ${session?.topic || STRINGS.recentHostedSessionTopicFallback}`);
    try {
      const response = await resumeServerGameSession(gameIdToResume);
      const snapshot = response?.snapshot && typeof response.snapshot === 'object'
        ? response.snapshot
        : response;
      const resumedPlayers = Array.isArray(snapshot?.players)
        ? snapshot.players.map((player) => String(player?.displayName || '').trim()).filter(Boolean)
        : [];
      const resumedTopic = String(snapshot?.boardState?.topic || session?.topic || '').trim();
      const resumedLanguage = String(session?.language || config.lang || 'en').trim().toLowerCase() || 'en';
      setConfig((prev) => ({
        ...prev,
        topic: resumedTopic,
        lang: resumedLanguage,
        playersText: resumedPlayers.join(', ')
      }));
      setRuntimeMode('server');
      setCardError('');
      serverEngine.clearError();
      serverEngine.adoptCreatedSession(response, {
        players: resumedPlayers,
        language: resumedLanguage,
        topic: resumedTopic
      });
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || STRINGS.recentHostedSessionReviewLoadError;
      setWorkspaceError(detail);
    } finally {
      setWorkspacePending(false);
    }
  }

  function handleLaunchRecentHostedSession(session) {
    setActiveHostedSession(session || null);
    setWorkspaceError('');
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    if (!session?.gameId) {
      setConfig((prev) => ({
        ...prev,
        topic: nextConfig.topic,
        lang: nextConfig.lang,
        playersText: nextConfig.playersText
      }));
      setWorkspaceMessage(`${STRINGS.recentHostedSessionLaunchPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`);
      launchRound({
        playersText: nextConfig.playersText,
        topic: nextConfig.topic,
        language: nextConfig.lang
      });
      return;
    }

    setWorkspacePending(true);
    setWorkspaceMessage(`${STRINGS.recentHostedSessionLaunchPrefix} ${nextConfig.topic || STRINGS.recentHostedSessionTopicFallback}`);
    duplicateServerGameSession(session.gameId)
      .then((response) => {
        const snapshot = response?.snapshot && typeof response.snapshot === 'object'
          ? response.snapshot
          : response;
        const duplicatedPlayers = Array.isArray(snapshot?.players)
          ? snapshot.players.map((player) => String(player?.displayName || '').trim()).filter(Boolean)
          : parsePlayers(nextConfig.playersText);
        const duplicatedTopic = String(snapshot?.boardState?.topic || nextConfig.topic || '').trim();
        setConfig((prev) => ({
          ...prev,
          topic: duplicatedTopic,
          lang: nextConfig.lang,
          playersText: duplicatedPlayers.join(', ')
        }));
        setRuntimeMode('server');
        setCardError('');
        serverEngine.clearError();
        serverEngine.adoptCreatedSession(response, {
          language: nextConfig.lang
        });
      })
      .catch((error) => {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || STRINGS.recentHostedSessionReviewError;
        setWorkspaceError(detail);
      })
      .finally(() => {
        setWorkspacePending(false);
      });
  }

  const appTitle = String(runtimeSnapshot?.branding?.branding?.appName || STRINGS.title).trim() || STRINGS.title;
  const hostLaunchMessage = resolveHostedRuntimeBlockMessage(runtimeSnapshot?.subscription);
  const hostLaunchBlocked = Boolean(runtimeSnapshot?.me?.selectedTenantId) && Boolean(hostLaunchMessage);

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  useEffect(() => {
    async function loadCard() {
      if (runtimeMode !== 'local') return;
      if (legacyPhase !== GamePhase.LOADING_CARD) return;
      if (!gameId) return;

      try {
        setCardError('');
        const card = await fetchNextCard({
          topic: config.topic || undefined,
          language: config.lang,
          gameId
        });
        legacyCardLoaded(card);
      } catch (error) {
        setCardError(resolveCardErrorMessage(error) || STRINGS.cardErrorFallback);
        legacyCardLoadFailed();
      }
    }

    loadCard();
  }, [runtimeMode, legacyLoadTicket, legacyCardLoaded, legacyCardLoadFailed, legacyPhase, gameId, config.topic, config.lang]);

  useEffect(() => {
    const cardId = engine.card?.cardId || engine.card?.id || '';
    if (!cardId || engine.phase === GamePhase.SETUP) {
      lastAudioCardRef.current = '';
      lastRevealedCountRef.current = 0;
      lastWrongCountRef.current = 0;
      return;
    }

    if (cardId !== lastAudioCardRef.current) {
      playRoundIntro();
      lastAudioCardRef.current = cardId;
      lastRevealedCountRef.current = engine.revealedIndexes.size;
      lastWrongCountRef.current = engine.wrongIndexes.size;
      return;
    }

    const revealedCount = engine.revealedIndexes.size;
    const wrongCount = engine.wrongIndexes.size;

    if (revealedCount > lastRevealedCountRef.current) {
      playCorrect();
    }
    if (wrongCount > lastWrongCountRef.current) {
      playWrong();
    }

    lastRevealedCountRef.current = revealedCount;
    lastWrongCountRef.current = wrongCount;
  }, [engine.card, engine.phase, engine.revealedIndexes, engine.wrongIndexes, playCorrect, playRoundIntro, playWrong]);

  function launchRound({ playersText = config.playersText, topic = config.topic, language = config.lang } = {}) {
    if (hostLaunchBlocked) {
      setRuntimeWarning(hostLaunchMessage || STRINGS.hostedRuntimeBlocked);
      return;
    }
    const parsedPlayers = parsePlayers(playersText);
    if (isServerEngineEnabled()) {
      setRuntimeMode('server');
      setCardError('');
      serverEngine.clearError();
      serverEngine.startRound({
        players: parsedPlayers,
        language,
        topic: topic || undefined,
        winCondition: 30
      });
      return;
    }

    setRuntimeMode('local');
    serverEngine.resetToSetup();
    serverEngine.clearError();
    legacyEngine.startRound(playersText);
  }

  function handleStartRound(playersTextOverride = null) {
    launchRound({
      playersText: playersTextOverride ?? config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }

  function handlePlayAgain() {
    launchRound({
      playersText: config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }

  function handleRestart() {
    legacyEngine.resetToSetup();
    serverEngine.resetToSetup();
    serverEngine.clearError();
    setRuntimeMode('local');
    setCardError('');
    if (runtimeSnapshot?.me?.selectedTenantId) {
      refreshWorkspaceInsights();
    }
  }

  const activeError = runtimeMode === 'server' ? serverEngine.errorMessage : cardError;
  const controlsDisabled = runtimeMode === 'server' && !serverEngine.isLocalTurn;

  return (
    <main data-phase={engine.phase === GamePhase.SETUP ? 'setup' : 'game'}>
      <BuildBadge />
      <AudioControls
        muted={audioMuted}
        volume={audioVolume}
        onToggleMute={toggleAudioMute}
        onVolumeChange={setAudioVolume}
      />
      {engine.phase === GamePhase.SETUP ? (
        <>
          {activePlayerRouteRoomCode ? (
            playerRouteMatchesSavedPlayerSession ? (
              <RoomPanel
                appTitle={String(playerRoutePreview?.branding?.appName || appTitle).trim() || appTitle}
                draft={roomDraft}
                pending={roomPending}
                message={roomMessage}
                error={roomError}
                roomSession={roomSession}
                selectedRoomPlayerNames={selectedRoomPlayerNames}
                onDraftChange={setRoomDraft}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onResumeRoom={handleResumeRoom}
                onClearRoom={handleClearRoom}
                onSelectAllRoomPlayers={handleSelectAllRoomPlayers}
                onToggleRoomPlayer={handleToggleRoomPlayer}
                onUseRoomPlayers={handleUseRoomPlayers}
                onStartRoomSession={handleStartRoomSession}
              />
            ) : (
              <PlayerJoinRoutePanel
                roomCode={activePlayerRouteRoomCode}
                appTitle={appTitle}
                preview={playerRoutePreview}
                pending={playerRoutePending || roomPending}
                message={playerRouteMessage}
                error={playerRouteError}
                displayName={playerRouteDisplayName}
                onDisplayNameChange={setPlayerRouteDisplayName}
                onJoin={handlePlayerRouteJoin}
                onBack={handleExitPlayerRoute}
              />
            )
          ) : startup.phase !== STARTUP_PHASE.READY ? <StartupStatePanel startup={startup} onRetry={loadTopics} appTitle={appTitle} /> : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 ? (
            <>
              {!runtimeSnapshot ? (
                <>
                  <PublicLaunchPanel
                    onStartTrial={focusOnboardingWorkspace}
                    onSignIn={focusSignInEmail}
                  />
                  <OnboardingPanel
                    draft={onboardingDraft}
                    pending={onboardingPending}
                    success={onboardingSuccess}
                    error={onboardingError}
                    onDraftChange={setOnboardingDraft}
                    onSubmit={handleOnboardingBootstrap}
                    workspaceInputRef={onboardingWorkspaceInputRef}
                  />
                  <SignInPanel
                    draft={signInDraft}
                    pending={signInPending}
                    success={signInSuccess}
                    error={signInError}
                    onDraftChange={setSignInDraft}
                    onSubmit={handleSignIn}
                    emailInputRef={signInEmailInputRef}
                  />
                </>
              ) : null}
              <RoomPanel
                appTitle={appTitle}
                draft={roomDraft}
                pending={roomPending}
                message={roomMessage}
                error={roomError}
                roomSession={roomSession}
                selectedRoomPlayerNames={selectedRoomPlayerNames}
                onDraftChange={setRoomDraft}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onResumeRoom={handleResumeRoom}
                onClearRoom={handleClearRoom}
                onSelectAllRoomPlayers={handleSelectAllRoomPlayers}
                onToggleRoomPlayer={handleToggleRoomPlayer}
                onUseRoomPlayers={handleUseRoomPlayers}
                onStartRoomSession={handleStartRoomSession}
              />
              <StartScreen
                topics={topics}
                config={config}
                setConfig={setConfig}
                onStart={handleStartRound}
                appTitle={appTitle}
                runtimeSnapshot={runtimeSnapshot}
                runtimeWarning={runtimeWarning}
                onUpgrade={handleUpgradeCheckout}
                onLogout={handleLogout}
                upgradePending={checkoutPending}
                upgradeMessage={checkoutMessage}
                checkoutUrl={checkoutUrl}
                workspaceInsights={workspaceInsights}
                workspacePending={workspacePending}
                workspaceError={workspaceError}
                hostLaunchBlocked={hostLaunchBlocked}
                hostLaunchMessage={hostLaunchMessage}
                workspaceMessage={workspaceMessage}
                brandingDraft={brandingDraft}
                brandingPending={brandingPending}
                brandingMessage={brandingMessage}
                brandingError={brandingError}
                sessionTemplates={sessionTemplates}
                sessionTemplateDraft={sessionTemplateDraft}
                sessionTemplatePending={sessionTemplatePending}
                sessionTemplateMessage={sessionTemplateMessage}
                sessionTemplateError={sessionTemplateError}
                onBrandingDraftChange={handleBrandingDraftChange}
                onSaveBranding={handleSaveBranding}
                onSessionTemplateDraftChange={handleSessionTemplateDraftChange}
                onSaveSessionTemplate={handleSaveSessionTemplate}
                onApplySessionTemplate={handleApplySessionTemplate}
                onDeleteSessionTemplate={handleDeleteSessionTemplate}
                reviewedHostedSession={reviewedHostedSession}
                reviewedHostedSessionNote={reviewedHostedSessionNote}
                reviewedHostedSessionNoteMessage={reviewedHostedSessionNoteMessage}
                onReviewedHostedSessionNoteChange={handleReviewedHostedSessionNoteChange}
                onSaveReviewedHostedSessionNote={handleSaveReviewedHostedSessionNote}
                activeHostedSession={activeHostedSession}
                hostedSessionFilter={hostedSessionFilter}
                onHostedSessionFilterChange={setHostedSessionFilter}
                onUseRecentHostedSession={handleUseRecentHostedSession}
                onReviewRecentHostedSession={handleReviewRecentHostedSession}
                onResumeRecentHostedSession={handleResumeRecentHostedSession}
                onLaunchRecentHostedSession={handleLaunchRecentHostedSession}
                onSaveRecentHostedSessionAsTemplate={handleSaveRecentHostedSessionAsTemplate}
                canLaunchRecentHostedSessions={canLaunchRecentHostedSessions}
              />
            </>
          ) : null}
        </>
      ) : null}

      {engine.phase !== GamePhase.SETUP && engine.phase !== GamePhase.ROUND_SUMMARY && engine.phase !== GamePhase.GAME_OVER ? (
        <>
          {engine.phase === GamePhase.LOADING_CARD ? (
            <section className="board-surface card-loading-panel" data-testid="card-loading-panel">
              <p>{STRINGS.loadingCard}</p>
              <div className="card-loading-skeleton" aria-hidden />
            </section>
          ) : null}
          {activeError ? (
            <div className="error-panel">
              {isDeckExhaustedMessage(activeError) ? (
                <>
                  <p className="error">{STRINGS.deckExhausted}</p>
                  <p>{STRINGS.deckExhaustedHint}</p>
                  <div className="row-actions">
                    <button type="button" onClick={handleRestart}>
                      {STRINGS.changeFilters}
                    </button>
                    <button type="button" onClick={handlePlayAgain}>
                      {STRINGS.restartGame}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="error">{activeError}</p>
                  <button type="button" onClick={engine.beginCardLoad}>
                    {STRINGS.retry}
                  </button>
                </>
              )}
            </div>
          ) : null}
          {engine.card ? (
            <GameBoard
              card={engine.card}
              selectedIndexes={engine.selectedIndexes}
              selectedRank={engine.selectedRank}
              revealedIndexes={engine.revealedIndexes}
              wrongIndexes={engine.wrongIndexes}
              toggleIndex={engine.toggleOption}
              onRankSelect={engine.chooseRank}
              phase={engine.phase}
              onAnswer={engine.requestConfirm}
              onConfirm={engine.confirmAnswer}
              onCancelConfirm={engine.cancelConfirm}
              onPass={engine.passTurn}
              onNext={engine.nextStep}
              canPass={engine.canPass}
              players={engine.players}
              scores={engine.scores}
              currentPlayerIndex={engine.currentPlayerIndex}
              controlsDisabled={controlsDisabled}
              roundNumber={engine.roundNumber}
              passNote={STRINGS.passNote}
              lastAction={engine.lastAction}
              currentPlayer={engine.currentPlayer}
              targetScore={engine.targetScore}
              eliminatedPlayers={engine.eliminatedPlayers}
              passedPlayers={engine.passedPlayers}
              starterPlayer={engine.players[engine.starterIndex] ?? engine.currentPlayer}
            />
          ) : null}
        </>
      ) : null}

      {engine.phase === GamePhase.ROUND_SUMMARY || engine.phase === GamePhase.GAME_OVER ? (
        <RoundSummary
          players={engine.players}
          scores={engine.scores}
          stats={engine.stats}
          roundNumber={engine.roundNumber}
          onNextRound={engine.nextStep}
          onRestart={handleRestart}
          onPlayAgain={handlePlayAgain}
          winner={engine.winner}
        />
      ) : null}
    </main>
  );
}

export default function App() {
  if (isAdminConsoleRoute()) {
    return <AdminConsole />;
  }
  return <GameApp />;
}

