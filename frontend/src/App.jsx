import { useCallback, useEffect, useRef, useState } from 'react';
import {
  API_BASE,
  bootstrapOnboardingTenant,
  clearRuntimeAuthContext,
  completeRuntimeAuth,
  createRoomSession,
  deleteRuntimeSessionReviewNote,
  duplicateServerGameSession,
  deleteRuntimeSessionTemplate,
  fetchRoomPreview,
  fetchTenantAuditEvents,
  resumeServerGameSession,
  fetchServerGameSession,
  fetchTenantRuntimeSnapshot,
  fetchTenantUsageSummary,
  fetchTopics,
  hasRuntimeAuthContext,
  initiateCheckoutSession,
  joinRoomSession,
  logoutRuntimeAuth,
  removeRoomPlayerFromSession,
  rejoinRoomSession,
  requestRuntimeAuthLink,
  setRuntimeAuthContext,
  upsertRuntimeSessionReviewNote,
  upsertRuntimeSessionTemplate,
  updateRuntimeTenantBranding,
  resolveTopicsErrorState
} from './api';
import AdminConsole from './admin/AdminConsole';
import GameBoard from './components/GameBoard';
import GameRoom from './components/GameRoom';
import HostDashboard from './components/HostDashboard';
import PlayerJoin from './components/PlayerJoin';
import RoundSummary from './components/RoundSummary';
import HomeScreen from './components/home/HomeScreen';
import JoinGameScreen from './components/home/JoinGameScreen';
import PracticePlaceholder from './components/home/PracticePlaceholder';
import GameplayActionBar from './components/gameplay/GameplayActionBar';
import ScoreBoard from './components/gameplay/ScoreBoard';
import { getCanAnswer, getCardCategory, getPhaseLabel } from './components/gameplay/gameplayState';
import LobbySupportPanel from './components/room/LobbySupportPanel';
import AppHeader from './components/shell/AppHeader';
import AppShell from './components/shell/AppShell';
import MainStage from './components/shell/MainStage';
import PrimaryActionBar from './components/shell/PrimaryActionBar';
import SidePanel from './components/shell/SidePanel';
import { useAudioFeedback } from './audio/useAudioFeedback';
import { MAX_PLAYERS_PER_ROOM } from './constants/runtime';
import {
  buildPlayerJoinUrl,
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  normalizePlayerName,
  normalizeRoomCodeInput
} from './roomRuntime';
import { useServerGameEngine } from './state/useServerGameEngine';
import {
  loadOrCreatePlayerProfile,
  recordSoloGameStarted,
  recordSoloRoundResult,
  savePlayerProfile,
  updatePlayerProfileDisplayName
} from './state/playerProfile';
import { DEFAULT_LANGS, GamePhase } from './state/types';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Pick a topic, add players, then open a room or start the live game.',
  homeTagline: 'Fast entry for live quiz hosts, players, and quick solo practice.',
  loadingTopics: 'Loading topics...',
  noTopics: 'No topics yet.',
  noTopicsHint: 'Import clean cards to populate topics and retry.',
  startRound: 'Start game',
  loadingCard: 'Loading round card...',
  retry: 'Retry',
  checkBackendUrl: 'Check backend URL:',
  openHealth: 'Open health',
  backendWarmupTitle: 'Waking up backend...',
  backendWarmupDetail: 'Render free instances can take a while to start. SmartIQ is retrying automatically.',
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
  hostWorkspaceAnalyticsFollowUpQueue: 'Follow-up queue',
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
  roomTrimSelectedPlayersSubmit: 'Trim to selected',
  roomTrimSelectedPlayersPrefix: 'Room trimmed to selected roster:',
  roomRemovePlayerSubmit: 'Remove',
  roomRemovePlayerPrefix: 'Removed room player:',
  roomUsePlayersMessage: 'Room players loaded into the live session setup.',
  recentHostedSessionsTitle: 'Recent hosted sessions',
  recentHostedSessionsEmpty: 'No hosted sessions launched yet.',
  recentHostedSessionPlayers: 'players',
  recentHostedSessionStatusLiveBadge: 'Live',
  recentHostedSessionStatusCompletedBadge: 'Completed',
  recentHostedSessionNoteBadge: 'Note saved',
  recentHostedSessionFilterAll: 'All',
  recentHostedSessionFilterLive: 'Live',
  recentHostedSessionFilterCompleted: 'Completed',
  recentHostedSessionFilterNotes: 'Needs follow-up',
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
  recentHostedSessionNotesClearSubmit: 'Clear note',
  recentHostedSessionNotesSaved: 'Follow-up note saved.',
  recentHostedSessionNotesCleared: 'Follow-up note cleared.',
  recentHostedSessionLeaderPrefix: 'Current leader:',
  recentHostedSessionStatusPrefix: 'Status:',
  recentHostedSessionStatusLive: 'Live',
  recentHostedSessionStatusCompleted: 'Completed',
  recentHostedSessionReviewError: 'Could not launch duplicate session from host history.',
  recentHostedSessionReviewLoadError: 'Could not load session review from host history.'
};
const CONFIG_STORAGE_KEY = 'smartiq.roundConfig';
const ROOM_SESSION_STORAGE_KEY = 'smartiq.roomSession';
const ROOM_SELECTION_STORAGE_PREFIX = 'smartiq.roomSelection.';
const SESSION_REVIEW_NOTE_STORAGE_PREFIX = 'smartiq.sessionReviewNote.';
const STARTUP_PHASE = {
  LOADING: 'loading',
  WARMING: 'warming',
  BACKEND_UNREACHABLE: 'backend-unreachable',
  FORBIDDEN: 'forbidden',
  SERVER_ERROR: 'server-error',
  NOT_FOUND: 'not-found',
  TOPICS_EMPTY: 'topics-empty',
  READY: 'ready'
};
const ENTRY_ROUTE = {
  HOME: 'home',
  START: 'start',
  JOIN: 'join',
  PRACTICE: 'practice',
  HOST_TRIAL: 'host-trial',
  HOST_SIGNIN: 'host-signin'
};
const SOLO_PLAYER_NAME = 'Solo Player';
const SOLO_WIN_CONDITION = 1_000_000;
const SHOW_BUILD_BADGE = import.meta.env.DEV
  || String(import.meta.env.VITE_SHOW_BUILD_BADGE || '').toLowerCase() === 'true';
const BUILD_SHA = String(import.meta.env.VITE_BUILD_SHA || '').trim();

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

function buildHostWorkspaceAnalytics(sessions, templateCount, sessionReviewNotes) {
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
  return Array.from({ length: Math.min(playerCount, MAX_PLAYERS_PER_ROOM) }, (_, index) => `Player ${index + 1}`);
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

function buildSessionReviewNoteLookup(notes) {
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

function readRuntimeSessionReviewNotes(settingsResponse) {
  return buildSessionReviewNoteLookup(settingsResponse?.settings?.host?.sessionReviewNotes);
}

function resolveSessionReviewNote(sessionReviewNotes, gameId) {
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

function resolveEntryRoute() {
  if (typeof window === 'undefined') {
    return ENTRY_ROUTE.HOME;
  }
  const hash = String(window.location?.hash || '').trim().toLowerCase();
  if (hash === '#/start') {
    return ENTRY_ROUTE.START;
  }
  if (hash === '#/join') {
    return ENTRY_ROUTE.JOIN;
  }
  if (hash === '#/practice') {
    return ENTRY_ROUTE.PRACTICE;
  }
  if (hash === '#/host/trial') {
    return ENTRY_ROUTE.HOST_TRIAL;
  }
  if (hash === '#/host/signin') {
    return ENTRY_ROUTE.HOST_SIGNIN;
  }
  return ENTRY_ROUTE.HOME;
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

function BuildBadge({ inline = false }) {
  if (!SHOW_BUILD_BADGE) {
    return null;
  }

  const badgeText = BUILD_SHA ? `DEV BUILD ${BUILD_SHA.slice(0, 7)}` : 'DEV BUILD';
  return (
    <p className={`build-badge${inline ? ' build-badge--inline' : ''}`} data-testid="build-badge">
      {badgeText}
    </p>
  );
}

function AudioControls({ muted, volume, onToggleMute, onVolumeChange, inline = false }) {
  return (
    <section
      className={`audio-controls board-surface${inline ? ' audio-controls--inline' : ''}`}
      data-testid="audio-controls"
      aria-label="Audio controls"
    >
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
  hostLaunchBlocked,
  playerDraft,
  onPlayerDraftChange,
  onCommitPlayerDraft,
  onRemovePlayer,
  showStartButton = true
}) {
  const players = parsePlayers(config.playersText);
  const draftPlayers = parsePlayers(playerDraft);
  const activeTopic = config.topic || 'Any Topic';
  const activeLanguage = String(config.lang || 'en').toUpperCase();
  const activeDifficulty = DIFFICULTY_OPTIONS.find((entry) => entry.value === config.difficulty)?.label || 'Medium';
  const tenantId = runtimeSnapshot?.me?.selectedTenantId || '';
  const planCode = runtimeSnapshot?.subscription?.planCode || '';
  const capabilities = runtimeSnapshot?.capabilities || null;
  const maxHostedPlayers = Number.isInteger(capabilities?.maxHostedPlayers)
    ? Math.min(capabilities.maxHostedPlayers, MAX_PLAYERS_PER_ROOM)
    : null;
  const mergedPlayerCount = Array.from(new Set([...players, ...draftPlayers])).length;
  const overHostedPlayerCap = maxHostedPlayers != null && mergedPlayerCount > maxHostedPlayers;
  const canStart = (players.length > 0 || draftPlayers.length > 0) && !overHostedPlayerCap;

  return (
    <section className="setup-panel board-surface host-launch-panel" data-testid="host-launch-panel">
      <div className="host-launch-panel-header">
        <div>
          <p className="section-title">Host setup</p>
          <h2>{appTitle}</h2>
        </div>
        <div className="host-launch-stat">
          <span>Session</span>
          <strong>{tenantId ? 'Hosted runtime' : 'Quick start'}</strong>
        </div>
      </div>
      <p>{STRINGS.subtitle}</p>
      {tenantId ? (
        <p className="field-hint tenant-runtime-hint" data-testid="tenant-runtime-hint">
          Tenant runtime active: {tenantId}{planCode ? ` | plan ${planCode}` : ''}
        </p>
      ) : null}
      {runtimeWarning ? (
        <p className="field-hint runtime-warning" data-testid="tenant-runtime-warning">{runtimeWarning}</p>
      ) : null}
      <div className="host-setup-summary" data-testid="host-setup-summary">
        <div className="host-setup-summary-card">
          <span>Topic</span>
          <strong>{activeTopic}</strong>
        </div>
        <div className="host-setup-summary-card">
          <span>Difficulty</span>
          <strong>{activeDifficulty}</strong>
        </div>
        <div className="host-setup-summary-card">
          <span>Players</span>
          <strong>{mergedPlayerCount}</strong>
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
        onChange={(event) => onPlayerDraftChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            onCommitPlayerDraft(event.currentTarget.value);
          }
        }}
        onBlur={(event) => {
          onCommitPlayerDraft(event.currentTarget.value);
        }}
        placeholder={STRINGS.playersPlaceholder}
      />
      <div className="players-chips">
        {players.map((player) => (
          <button key={player} className="player-token" type="button" onClick={() => onRemovePlayer(player)}>
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

      {showStartButton ? (
        <button className="start-cta" onClick={onStart} disabled={!canStart || hostLaunchBlocked} type="button">
          {STRINGS.startRound}
        </button>
      ) : null}
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

  if (startup.phase === STARTUP_PHASE.WARMING) {
    return (
      <section className="setup-panel board-surface startup-panel" data-testid="startup-warming-panel">
        <h1>{appTitle}</h1>
        <div className="error-panel error-panel--warming">
          <p className="error">{startup.error?.title ?? STRINGS.backendWarmupTitle}</p>
          <p>{startup.error?.detail ?? STRINGS.backendWarmupDetail}</p>
        </div>
        {startup.warmup?.attempt ? (
          <p className="startup-hint" data-testid="startup-warming-attempt">
            Retry {startup.warmup.attempt} of {startup.warmup.totalAttempts}
          </p>
        ) : null}
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

function formatSessionReviewNotePreview(note) {
  const normalized = String(note || '').trim();
  if (!normalized) {
    return '';
  }
  return normalized.length > 64 ? `${normalized.slice(0, 61)}...` : normalized;
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
  const [entryRoute, setEntryRoute] = useState(resolveEntryRoute());
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
    error: null,
    warmup: null
  });
  const [config, setConfig] = useState({
    topic: storedConfig?.topic ?? '',
    difficulty: storedConfig?.difficulty ?? '2',
    lang: storedConfig?.lang ?? 'en',
    theme: storedConfig?.theme ?? 'classic',
    playersText: storedConfig?.playersText ?? ''
  });
  const [setupPlayerDraft, setSetupPlayerDraft] = useState('');
  const [playerProfile, setPlayerProfile] = useState(() => loadOrCreatePlayerProfile());
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
  const [sessionReviewNotes, setSessionReviewNotes] = useState({});
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

  const serverEngine = useServerGameEngine(30);
  const engine = serverEngine;

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
  const soloLaunchAttemptedRef = useRef(false);
  const processedSoloResolutionRef = useRef('');
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
      error: null,
      warmup: null
    });

    try {
      const data = await fetchTopics({
        onWarmupChange: ({ attempt, totalAttempts, nextDelayMs }) => {
          setStartup({
            phase: STARTUP_PHASE.WARMING,
            error: {
              title: STRINGS.backendWarmupTitle,
              detail: STRINGS.backendWarmupDetail
            },
            warmup: {
              attempt,
              totalAttempts,
              nextDelayMs
            }
          });
        }
      });
      setTopics(data);
      if (data.length > 0) {
        setStartup({
          phase: STARTUP_PHASE.READY,
          error: null,
          warmup: null
        });
        setConfig((prev) => {
          const topicExists = data.some((entry) => entry.topic === prev.topic);
          return { ...prev, topic: topicExists ? prev.topic : '' };
        });
        return;
      }

      setStartup({
        phase: STARTUP_PHASE.TOPICS_EMPTY,
        error: null,
        warmup: null
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
        error: resolved,
        warmup: null
      });
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    function handleHashChange() {
      setEntryRoute(resolveEntryRoute());
      setPlayerJoinRoute(resolvePlayerJoinRoute());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (entryRoute !== ENTRY_ROUTE.PRACTICE) {
      soloLaunchAttemptedRef.current = false;
    }
  }, [entryRoute]);

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
    setReviewedHostedSessionNote(resolveSessionReviewNote(sessionReviewNotes, reviewedHostedSession.gameId));
  }, [reviewedHostedSession, sessionReviewNotes]);

  useEffect(() => {
    setReviewedHostedSessionNoteMessage('');
  }, [reviewedHostedSession?.gameId]);

  useEffect(() => {
    if (roomSession?.role !== 'host' || !roomSession?.roomCode) {
      return;
    }
    persistRoomSelection(roomSession.roomCode, selectedRoomPlayerNames);
  }, [roomSession, selectedRoomPlayerNames]);

  useEffect(() => {
    loadTopics();
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
    setSessionReviewNotes(readRuntimeSessionReviewNotes(snapshot?.settings));
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
    setSessionReviewNotes({});
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

  function commitSetupPlayers(rawValue = setupPlayerDraft) {
    const existingPlayers = parsePlayers(config.playersText);
    const incomingPlayers = parsePlayers(rawValue);
    const mergedPlayers = Array.from(new Set([...existingPlayers, ...incomingPlayers]));
    setConfig((prev) => ({ ...prev, playersText: mergedPlayers.join(', ') }));
    setSetupPlayerDraft('');
    return mergedPlayers;
  }

  function handleRemoveSetupPlayer(player) {
    const nextPlayers = parsePlayers(config.playersText).filter((entry) => entry !== player);
    setConfig((prev) => ({ ...prev, playersText: nextPlayers.join(', ') }));
  }

  function handleStartSetupRound() {
    const mergedPlayers = commitSetupPlayers();
    if (mergedPlayers.length === 0) {
      return;
    }
    launchRound({
      playersText: mergedPlayers.join(', '),
      topic: config.topic,
      language: config.lang
    });
  }

  async function handleSaveCurrentSetupTemplate() {
    const mergedPlayers = commitSetupPlayers();
    if (mergedPlayers.length === 0) {
      return;
    }
    await handleSaveSessionTemplate({
      name: sessionTemplateDraft.name,
      topic: config.topic,
      language: config.lang,
      theme: config.theme,
      players: mergedPlayers
    });
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

  async function handleSaveReviewedHostedSessionNote() {
    if (!reviewedHostedSession?.gameId) {
      return;
    }
    const normalizedNote = String(reviewedHostedSessionNote || '').trim();
    if (!normalizedNote) {
      return;
    }
    if (runtimeSnapshot?.me?.selectedTenantId) {
      try {
        const response = await upsertRuntimeSessionReviewNote(reviewedHostedSession.gameId, {
          note: normalizedNote
        });
        setSessionReviewNotes(buildSessionReviewNoteLookup(response?.notes));
      } catch (error) {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || 'Could not save follow-up note.';
        setReviewedHostedSessionNoteMessage(detail);
        return;
      }
    }
    persistSessionReviewNote(reviewedHostedSession.gameId, normalizedNote);
    setReviewedHostedSessionNote(normalizedNote);
    setReviewedHostedSessionNoteMessage(STRINGS.recentHostedSessionNotesSaved);
  }

  async function handleClearReviewedHostedSessionNote() {
    if (!reviewedHostedSession?.gameId) {
      return;
    }
    if (runtimeSnapshot?.me?.selectedTenantId) {
      try {
        const response = await deleteRuntimeSessionReviewNote(reviewedHostedSession.gameId);
        setSessionReviewNotes(buildSessionReviewNoteLookup(response?.notes));
      } catch (error) {
        const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
          ? error.detail
          : error?.message || 'Could not clear follow-up note.';
        setReviewedHostedSessionNoteMessage(detail);
        return;
      }
    }
    persistSessionReviewNote(reviewedHostedSession.gameId, '');
    setReviewedHostedSessionNote('');
    setReviewedHostedSessionNoteMessage(STRINGS.recentHostedSessionNotesCleared);
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
    setEntryRoute(ENTRY_ROUTE.HOME);
    setPlayerJoinRoute(null);
    setPlayerRoutePreview(null);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
  }

  function handleNavigateEntry(nextRoute) {
    if (typeof window === 'undefined') {
      setEntryRoute(nextRoute);
      return;
    }
    if (nextRoute === ENTRY_ROUTE.HOME) {
      window.location.hash = '';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.START) {
      window.location.hash = '#/start';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.JOIN) {
      window.location.hash = '#/join';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.PRACTICE) {
      window.location.hash = '#/practice';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.HOST_TRIAL) {
      window.location.hash = '#/host/trial';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.HOST_SIGNIN) {
      window.location.hash = '#/host/signin';
    }
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

  async function handleRemoveRoomPlayer(player) {
    if (roomPending || roomSession?.role !== 'host' || !roomSession?.roomCode || !roomSession?.playerId || !roomSession?.authToken) {
      return;
    }
    const targetPlayerId = String(player?.playerId || '').trim();
    const targetDisplayName = String(player?.displayName || targetPlayerId || 'Player').trim() || 'Player';
    if (!targetPlayerId || targetPlayerId === roomSession.playerId) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const nextRoomState = await removeRoomPlayerFromSession(roomSession.roomCode, {
        hostPlayerId: roomSession.playerId,
        hostAuthToken: roomSession.authToken,
        targetPlayerId
      });
      applyRoomSession({
        ...roomSession,
        roomState: nextRoomState
      }, `${STRINGS.roomRemovePlayerPrefix} ${targetDisplayName}`);
      setSelectedRoomPlayerNames((prev) => prev.filter((entry) => entry !== normalizePlayerName(targetDisplayName)));
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not remove room player.';
      setRoomError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  async function handleTrimRoomToSelectedPlayers() {
    if (roomPending || roomSession?.role !== 'host' || !roomSession?.roomCode || !roomSession?.playerId || !roomSession?.authToken) {
      return;
    }
    const selectedNames = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
    if (selectedNames.length === 0) {
      setRoomError(STRINGS.roomSelectedRosterEmpty);
      return;
    }
    const playersToRemove = (Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players : [])
      .filter((player) => player?.playerId !== roomSession.playerId)
      .filter((player) => !selectedNames.includes(normalizePlayerName(player?.displayName || player?.playerId || '')));
    if (playersToRemove.length === 0) {
      return;
    }

    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      let nextRoomState = roomSession.roomState;
      for (const player of playersToRemove) {
        nextRoomState = await removeRoomPlayerFromSession(roomSession.roomCode, {
          hostPlayerId: roomSession.playerId,
          hostAuthToken: roomSession.authToken,
          targetPlayerId: player.playerId
        });
      }
      applyRoomSession({
        ...roomSession,
        roomState: nextRoomState
      }, `${STRINGS.roomTrimSelectedPlayersPrefix} ${selectedNames.join(', ')}`);
    } catch (error) {
      const detail = typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : error?.message || 'Could not trim room players.';
      setRoomError(detail);
    } finally {
      setRoomPending(false);
    }
  }

  function handleUseRecentHostedSession(session) {
    setActiveHostedSession(session || null);
    setWorkspaceError('');
    const nextConfig = resolveRecentHostedSessionConfig(session, config, roomSession, reviewedHostedSession);
    if (roomSession?.roomCode) {
      handleClearRoom();
    }
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
  const resolvedSoloPlayerName = String(playerProfile?.displayName || SOLO_PLAYER_NAME).trim() || SOLO_PLAYER_NAME;

  useEffect(() => {
    document.title = appTitle;
  }, [appTitle]);

  useEffect(() => {
    savePlayerProfile(playerProfile);
  }, [playerProfile]);

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

  function launchRound({
    playersText = config.playersText,
    topic = config.topic,
    language = config.lang,
    mode = 'standard',
    winCondition = 30
  } = {}) {
    if (hostLaunchBlocked) {
      setRuntimeWarning(hostLaunchMessage || STRINGS.hostedRuntimeBlocked);
      return;
    }
    const parsedPlayers = parsePlayers(playersText);
    serverEngine.clearError();
    serverEngine.startRound({
      players: parsedPlayers,
      language,
      topic: topic || undefined,
      winCondition,
      mode
    });
  }

  function handleStartRound(playersTextOverride = null) {
    launchRound({
      playersText: playersTextOverride ?? config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }

  function handlePlayAgain() {
    if (serverEngine.gameMode === 'solo') {
      processedSoloResolutionRef.current = '';
      setPlayerProfile((prev) => recordSoloGameStarted(prev));
      launchRound({
        playersText: resolvedSoloPlayerName,
        topic: '',
        language: 'en',
        mode: 'solo',
        winCondition: SOLO_WIN_CONDITION
      });
      return;
    }
    launchRound({
      playersText: config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }

  function handleRestart() {
    serverEngine.resetToSetup();
    serverEngine.clearError();
    processedSoloResolutionRef.current = '';
    if (serverEngine.gameMode === 'solo') {
      handleNavigateEntry(ENTRY_ROUTE.HOME);
      return;
    }
    if (runtimeSnapshot?.me?.selectedTenantId) {
      refreshWorkspaceInsights();
    }
  }

  function handleStartSoloMode() {
    processedSoloResolutionRef.current = '';
    setPlayerProfile((prev) => recordSoloGameStarted(prev));
    launchRound({
      playersText: resolvedSoloPlayerName,
      topic: '',
      language: 'en',
      mode: 'solo',
      winCondition: SOLO_WIN_CONDITION
    });
  }

  function handleExitSoloMode() {
    serverEngine.resetToSetup();
    serverEngine.clearError();
    processedSoloResolutionRef.current = '';
    handleNavigateEntry(ENTRY_ROUTE.HOME);
  }

  function handlePlayerProfileNameChange(nextName) {
    setPlayerProfile((prev) => updatePlayerProfileDisplayName(prev, nextName));
  }

  useEffect(() => {
    if (entryRoute !== ENTRY_ROUTE.PRACTICE) {
      return;
    }
    if (startup.phase !== STARTUP_PHASE.READY) {
      return;
    }
    if (soloLaunchAttemptedRef.current) {
      return;
    }
    if (serverEngine.phase !== GamePhase.SETUP) {
      return;
    }
    if (roomSession || activePlayerRouteRoomCode) {
      return;
    }
    soloLaunchAttemptedRef.current = true;
    handleStartSoloMode();
  }, [activePlayerRouteRoomCode, entryRoute, roomSession, serverEngine.phase, startup.phase]);

  useEffect(() => {
    if (serverEngine.gameMode !== 'solo') {
      return;
    }
    if (serverEngine.phase !== GamePhase.ROUND_SUCCESS && serverEngine.phase !== GamePhase.ROUND_FAIL) {
      return;
    }
    if (!serverEngine.resolutionState) {
      return;
    }

    const resolutionKey = [
      serverEngine.roundNumber,
      serverEngine.phase,
      serverEngine.resolutionState.selectedIndex,
      serverEngine.resolutionState.lastAction
    ].join(':');

    if (processedSoloResolutionRef.current === resolutionKey) {
      return;
    }

    processedSoloResolutionRef.current = resolutionKey;
    setPlayerProfile((prev) => recordSoloRoundResult(prev, {
      xpGained: serverEngine.resolutionState?.xpGained ?? 0,
      wasSuccessful: serverEngine.phase === GamePhase.ROUND_SUCCESS
    }));
  }, [serverEngine.gameMode, serverEngine.phase, serverEngine.resolutionState, serverEngine.roundNumber]);

  const activeError = serverEngine.errorMessage;
  const soloModeActive = serverEngine.gameMode === 'solo';
  const controlsDisabled = !serverEngine.isLocalTurn;
  const setupPlayers = parsePlayers(config.playersText);
  const setupDraftPlayers = parsePlayers(setupPlayerDraft);
  const setupMergedPlayerCount = Array.from(new Set([...setupPlayers, ...setupDraftPlayers])).length;
  const hostRoomSession = roomSession?.role === 'host' ? roomSession : null;
  const selectedRoomPlayers = hostRoomSession ? getSelectedRoomPlayerNames(hostRoomSession, selectedRoomPlayerNames) : [];
  const roomPlayerCount = Array.isArray(roomSession?.roomState?.players) ? roomSession.roomState.players.length : 0;
  const tenantId = runtimeSnapshot?.me?.selectedTenantId || '';
  const planCode = runtimeSnapshot?.subscription?.planCode || '';
  const planStatus = runtimeSnapshot?.subscription?.status || '';
  const selectedRole = String(runtimeSnapshot?.me?.selectedRole || '').trim().toLowerCase();
  const capabilities = runtimeSnapshot?.capabilities || null;
  const analyticsHistoryEnabled = capabilities?.analyticsHistoryEnabled === true;
  const sessionTemplatesEnabled = capabilities?.sessionTemplatesEnabled === true;
  const customBrandingEnabled = capabilities?.customBrandingEnabled === true;
  const canManageBrandingRole = selectedRole === 'owner' || selectedRole === 'admin';
  const maxHostedPlayers = Number.isInteger(capabilities?.maxHostedPlayers)
    ? Math.min(capabilities.maxHostedPlayers, MAX_PLAYERS_PER_ROOM)
    : null;
  const setupOverHostedPlayerCap = maxHostedPlayers != null && setupMergedPlayerCount > maxHostedPlayers;
  const planLimit = resolvePlanLimit(planCode);
  const usageRow = Array.isArray(workspaceInsights?.usageSummary)
    ? workspaceInsights.usageSummary.find((entry) => String(entry?.eventType || '').toLowerCase() === 'game.round.completed')
    : null;
  const recentHostedSessions = deriveRecentHostedSessions(workspaceInsights?.auditEvents);
  const hostWorkspaceAnalytics = buildHostWorkspaceAnalytics(recentHostedSessions, sessionTemplates.length, sessionReviewNotes);
  const visibleHostedSessions = recentHostedSessions.filter((entry) => {
    const hasSavedNote = Boolean(resolveSessionReviewNote(sessionReviewNotes, entry.gameId));
    if (hostedSessionFilter === 'completed') {
      return entry.status === 'completed';
    }
    if (hostedSessionFilter === 'live') {
      return entry.status !== 'completed';
    }
    if (hostedSessionFilter === 'notes') {
      return hasSavedNote;
    }
    return true;
  });
  const canUpgrade = Boolean(tenantId) && typeof handleUpgradeCheckout === 'function';
  const shellStatus = engine.phase === GamePhase.SETUP
    ? roomSession?.roomCode
      ? `Lobby ${roomSession.roomCode}`
      : tenantId
        ? 'Host setup'
        : 'Pre-show'
    : `Round ${engine.roundNumber}`;
  const shellEyebrow = engine.phase === GamePhase.SETUP
    ? 'Host setup'
    : 'Live game';
  const gameplayCategory = getCardCategory(engine.card);
  const gameplayPhaseLabel = getPhaseLabel(engine.phase);
  const gameplayCanAnswer = getCanAnswer(engine.selectedIndexes, controlsDisabled);
  const languageControl = (
    <div className="host-language-switch" role="group" aria-label="Host language">
      {DEFAULT_LANGS.map((lang) => {
        const selected = config.lang === lang;
        return (
          <button
            key={lang}
            type="button"
            className={`host-language-chip${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => setConfig((prev) => ({ ...prev, lang: lang }))}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
  const utilityArea = (
    <div className="host-utility-strip">
      <AudioControls
        muted={audioMuted}
        volume={audioVolume}
        onToggleMute={toggleAudioMute}
        onVolumeChange={setAudioVolume}
        inline
      />
      <span className="host-settings-chip">Single theme</span>
    </div>
  );
  const sharedRoomPanel = (
    <GameRoom
      strings={STRINGS}
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
      onToggleRoomPlayer={handleToggleRoomPlayer}
      onStartRoomSession={handleStartRoomSession}
      onRemoveRoomPlayer={handleRemoveRoomPlayer}
      onTrimRoomToSelectedPlayers={handleTrimRoomToSelectedPlayers}
    />
  );
  const launchConsolePanel = (
    <StartScreen
      topics={topics}
      config={config}
      setConfig={setConfig}
      onStart={handleStartSetupRound}
      appTitle={appTitle}
      runtimeSnapshot={runtimeSnapshot}
      runtimeWarning={runtimeWarning}
      hostLaunchBlocked={hostLaunchBlocked}
      playerDraft={setupPlayerDraft}
      onPlayerDraftChange={setSetupPlayerDraft}
      onCommitPlayerDraft={commitSetupPlayers}
      onRemovePlayer={handleRemoveSetupPlayer}
      showStartButton={false}
    />
  );
  const showProductHome = !runtimeSnapshot && !roomSession;
  const homeEntryPanel = showProductHome ? (
    <HomeScreen
      appTitle={appTitle}
      tagline={STRINGS.homeTagline}
      warning={runtimeWarning}
      profileName={playerProfile.displayName}
      profileLevel={playerProfile.level}
      profileXp={playerProfile.totalXp}
      onProfileNameChange={handlePlayerProfileNameChange}
      onStartGame={() => handleNavigateEntry(ENTRY_ROUTE.START)}
      onJoinGame={() => handleNavigateEntry(ENTRY_ROUTE.JOIN)}
      onPractice={() => handleNavigateEntry(ENTRY_ROUTE.PRACTICE)}
    />
  ) : null;
  const joinEntryPanel = (
    <JoinGameScreen
      roomCode={roomDraft.roomCode}
      displayName={roomDraft.displayName}
      pending={roomPending}
      message={roomMessage}
      error={roomError}
      onRoomCodeChange={(event) => setRoomDraft((prev) => ({
        ...prev,
        roomCode: normalizeRoomCodeInput(event.target.value)
      }))}
      onDisplayNameChange={(event) => setRoomDraft((prev) => ({
        ...prev,
        displayName: event.target.value
      }))}
      onJoin={handleJoinRoom}
      onBack={() => handleNavigateEntry(ENTRY_ROUTE.HOME)}
    />
  );
  const practiceEntryPanel = (
    <PracticePlaceholder onBack={() => handleNavigateEntry(ENTRY_ROUTE.HOME)} />
  );
  const setupActionBar = !roomSession ? (
    <PrimaryActionBar>
      <div className="app-shell-action-copy">
        <span>Primary action</span>
        <strong>{`${setupMergedPlayerCount} queued for launch`}</strong>
      </div>
      <button
        type="button"
        className="app-shell-primary-button"
        onClick={handleStartSetupRound}
        disabled={setupMergedPlayerCount === 0 || hostLaunchBlocked || setupOverHostedPlayerCap}
      >
        {STRINGS.startRound}
      </button>
    </PrimaryActionBar>
  ) : hostRoomSession ? (
    <PrimaryActionBar>
      <div className="app-shell-action-copy">
        <span>Lobby status</span>
        <strong>{`${roomPlayerCount} joined${selectedRoomPlayers.length !== roomPlayerCount ? ` • ${selectedRoomPlayers.length} selected` : ''}`}</strong>
      </div>
      <button
        type="button"
        className="app-shell-primary-button"
        onClick={handleStartRoomSession}
        disabled={roomPending || selectedRoomPlayers.length === 0 || hostLaunchBlocked}
      >
        {STRINGS.startRound}
      </button>
    </PrimaryActionBar>
  ) : (
    <PrimaryActionBar>
      <div className="app-shell-action-copy">
        <span>Player lobby</span>
        <strong>{roomSession?.roomCode ? `Room ${roomSession.roomCode}` : 'Room active'}</strong>
      </div>
    </PrimaryActionBar>
  );
  const hostLobbySupportPanel = hostRoomSession ? (
    <LobbySupportPanel
      roomCode={hostRoomSession.roomCode}
      joinLink={buildPlayerJoinUrl(hostRoomSession.roomCode)}
      onBackHome={() => {
        handleClearRoom();
        handleNavigateEntry(ENTRY_ROUTE.HOME);
      }}
    />
  ) : null;
  const hostRuntimePanels = !runtimeSnapshot || roomSession?.role === 'player' ? null : (
    <>
      <section className="setup-panel board-surface host-console-status-card" data-testid="host-console-status-card">
        <div className="host-console-status-head">
          <div>
            <p className="section-title">Console status</p>
            <h2>{appTitle}</h2>
          </div>
          <div className="host-plan-chip">
            <span>{planCode || 'trial'}</span>
            <strong>{formatSubscriptionStatus(planStatus)}</strong>
          </div>
        </div>
        <div className="host-console-status-actions">
          {typeof handleLogout === 'function' ? (
            <button type="button" className="secondary-action" onClick={handleLogout}>
              {STRINGS.signOutSubmit}
            </button>
          ) : null}
          {canUpgrade ? (
            <button type="button" onClick={handleUpgradeCheckout} disabled={checkoutPending}>
              {checkoutPending ? STRINGS.upgradeSubmitting : hostLaunchBlocked ? STRINGS.upgradeRecoverySubmit : STRINGS.upgradeSubmit}
            </button>
          ) : null}
        </div>
        {checkoutMessage ? <p className="field-hint" data-testid="upgrade-message">{checkoutMessage}</p> : null}
        {checkoutUrl ? (
          <a className="inline-link" data-testid="checkout-link" href={checkoutUrl}>
            {STRINGS.upgradeContinueSubmit}
          </a>
        ) : null}
      </section>
      <HostDashboard
        strings={STRINGS}
        appTitle={appTitle}
        planCode={planCode}
        planStatus={planStatus}
        billingCycle={runtimeSnapshot?.subscription?.billingCycle}
        maxHostedPlayers={maxHostedPlayers}
        planLimit={planLimit}
        analyticsHistoryEnabled={analyticsHistoryEnabled}
        usageRow={usageRow}
        workspacePending={workspacePending}
        workspaceError={workspaceError}
        workspaceMessage={workspaceMessage}
        hostLaunchBlocked={hostLaunchBlocked}
        hostLaunchMessage={hostLaunchMessage}
        hostWorkspaceAnalytics={hostWorkspaceAnalytics}
        customBrandingEnabled={customBrandingEnabled}
        brandingDraft={brandingDraft}
        brandingPending={brandingPending}
        brandingMessage={brandingMessage}
        brandingError={brandingError}
        sessionReviewNotes={sessionReviewNotes}
        sessionTemplatesEnabled={sessionTemplatesEnabled}
        sessionTemplateDraft={sessionTemplateDraft}
        sessionTemplatePending={sessionTemplatePending}
        sessionTemplateMessage={sessionTemplateMessage}
        sessionTemplateError={sessionTemplateError}
        sessionTemplates={sessionTemplates}
        visibleHostedSessions={visibleHostedSessions}
        auditEvents={workspaceInsights?.auditEvents}
        activeHostedSession={activeHostedSession}
        hostedSessionFilter={hostedSessionFilter}
        reviewedHostedSession={reviewedHostedSession}
        reviewedHostedSessionNote={reviewedHostedSessionNote}
        reviewedHostedSessionNoteMessage={reviewedHostedSessionNoteMessage}
        canUpgrade={canUpgrade}
        canSaveTemplate={setupMergedPlayerCount > 0}
        upgradePending={checkoutPending}
        canManageBrandingRole={canManageBrandingRole}
        onUpgrade={handleUpgradeCheckout}
        onBrandingDraftChange={handleBrandingDraftChange}
        onSaveBranding={handleSaveBranding}
        onSessionTemplateDraftChange={handleSessionTemplateDraftChange}
        onSaveTemplate={handleSaveCurrentSetupTemplate}
        onApplySessionTemplate={handleApplySessionTemplate}
        onDeleteSessionTemplate={handleDeleteSessionTemplate}
        onHostedSessionFilterChange={setHostedSessionFilter}
        onUseRecentHostedSession={handleUseRecentHostedSession}
        onReviewRecentHostedSession={handleReviewRecentHostedSession}
        onResumeRecentHostedSession={handleResumeRecentHostedSession}
        onLaunchRecentHostedSession={handleLaunchRecentHostedSession}
        onSaveRecentHostedSessionAsTemplate={handleSaveRecentHostedSessionAsTemplate}
        onReviewedHostedSessionNoteChange={handleReviewedHostedSessionNoteChange}
        onSaveReviewedHostedSessionNote={handleSaveReviewedHostedSessionNote}
        onClearReviewedHostedSessionNote={handleClearReviewedHostedSessionNote}
        canLaunchRecentHostedSessions={canLaunchRecentHostedSessions}
        formatSubscriptionStatus={formatSubscriptionStatus}
        formatAuditAction={formatAuditAction}
        resolveSessionReviewNote={resolveSessionReviewNote}
        formatSessionReviewNotePreview={formatSessionReviewNotePreview}
      />
    </>
  );
  const hostWorkspaceSideStack = (
    <div className="host-shell-stack">
      {!roomSession ? sharedRoomPanel : null}
      {hostRuntimePanels}
    </div>
  );
  const hostLobbySideStack = hostRoomSession ? (
    <div className="host-shell-stack">
      {hostLobbySupportPanel}
      {hostRuntimePanels}
    </div>
  ) : null;
  const setupSideStack = hostRoomSession ? hostLobbySideStack : hostWorkspaceSideStack;
  const gameplaySidePanel = (
    <SidePanel>
      <ScoreBoard
        players={engine.players}
        scores={engine.scores}
        currentPlayerIndex={engine.currentPlayerIndex}
        roundNumber={engine.roundNumber}
        lastAction={activeError ? '' : engine.lastAction}
        phaseLabel={gameplayPhaseLabel}
        currentPlayer={engine.currentPlayer}
        targetScore={engine.targetScore}
        eliminatedPlayers={engine.eliminatedPlayers}
        starterPlayer={engine.players[engine.starterIndex] ?? engine.currentPlayer}
        mode={soloModeActive ? 'solo' : 'standard'}
        sessionXp={engine.sessionXp}
        lastRoundXp={engine.lastRoundXp}
        profileName={playerProfile.displayName}
        profileLevel={playerProfile.level}
        profileXp={playerProfile.totalXp}
        profileGamesPlayed={playerProfile.gamesPlayed}
        profileRoundsWon={playerProfile.roundsWon}
      />
    </SidePanel>
  );
  const gameplayActionBar = (
    <PrimaryActionBar>
      <GameplayActionBar
        phase={engine.phase}
        category={gameplayCategory}
        nextTransition={engine.nextTransition}
        controlsDisabled={controlsDisabled}
        canAnswer={gameplayCanAnswer}
        onAnswer={engine.requestConfirm}
        onConfirm={engine.confirmAnswer}
        onCancelConfirm={engine.cancelConfirm}
        onNext={engine.nextStep}
        onBackToLobby={handleRestart}
        backLabel={hostRoomSession ? '← Back to lobby' : '← Back to setup'}
        currentPlayer={engine.currentPlayer}
      />
    </PrimaryActionBar>
  );

  return (
    <main className="host-app" data-phase={engine.phase === GamePhase.SETUP ? 'setup' : 'game'}>
      <BuildBadge />
      {engine.phase === GamePhase.SETUP ? (
        <>
          {activePlayerRouteRoomCode ? (
            playerRouteMatchesSavedPlayerSession ? (
              <AppShell
                mode="setup"
                header={(
                  <AppHeader
                    title={String(playerRoutePreview?.branding?.appName || appTitle).trim() || appTitle}
                    eyebrow={shellEyebrow}
                    status={shellStatus}
                    languageControl={languageControl}
                    utilityArea={utilityArea}
                  />
                )}
                main={<MainStage>{sharedRoomPanel}</MainStage>}
              />
            ) : (
              <PlayerJoin
                strings={STRINGS}
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
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && showProductHome && entryRoute === ENTRY_ROUTE.HOME ? (
            homeEntryPanel
          ) : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && showProductHome && entryRoute === ENTRY_ROUTE.JOIN ? (
            joinEntryPanel
          ) : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && showProductHome && entryRoute === ENTRY_ROUTE.PRACTICE ? (
            practiceEntryPanel
          ) : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && showProductHome && entryRoute === ENTRY_ROUTE.HOST_TRIAL ? (
            <OnboardingPanel
              draft={onboardingDraft}
              pending={onboardingPending}
              success={onboardingSuccess}
              error={onboardingError}
              onDraftChange={setOnboardingDraft}
              onSubmit={handleOnboardingBootstrap}
              workspaceInputRef={onboardingWorkspaceInputRef}
            />
          ) : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && showProductHome && entryRoute === ENTRY_ROUTE.HOST_SIGNIN ? (
            <SignInPanel
              draft={signInDraft}
              pending={signInPending}
              success={signInSuccess}
              error={signInError}
              onDraftChange={setSignInDraft}
              onSubmit={handleSignIn}
              emailInputRef={signInEmailInputRef}
            />
          ) : null}
          {!activePlayerRouteRoomCode && startup.phase === STARTUP_PHASE.READY && topics.length > 0 && (!showProductHome || entryRoute === ENTRY_ROUTE.START) ? (
            <AppShell
              mode="setup"
              header={(
                <AppHeader
                  title={appTitle}
                  eyebrow={shellEyebrow}
                  status={shellStatus}
                  languageControl={languageControl}
                  utilityArea={utilityArea}
                />
              )}
              main={(
                <MainStage>
                  {roomSession ? sharedRoomPanel : launchConsolePanel}
                </MainStage>
              )}
              side={<SidePanel>{setupSideStack}</SidePanel>}
              actionBar={setupActionBar}
            />
          ) : null}
        </>
      ) : null}

      {engine.phase !== GamePhase.SETUP && engine.phase !== GamePhase.GAME_OVER ? (
        <AppShell
          mode="game"
          header={(
            <AppHeader
              title={appTitle}
              eyebrow={shellEyebrow}
              status={shellStatus}
              languageControl={languageControl}
              utilityArea={utilityArea}
            />
          )}
          main={(
            <MainStage>
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
                    revealedIndexes={engine.revealedIndexes}
                    wrongIndexes={engine.wrongIndexes}
                    toggleIndex={engine.toggleOption}
                    phase={engine.phase}
                    controlsDisabled={controlsDisabled}
                    roundNumber={engine.roundNumber}
                    lastAction={engine.lastAction}
                    currentPlayer={engine.currentPlayer}
                    players={engine.players}
                    scores={engine.scores}
                    currentPlayerIndex={engine.currentPlayerIndex}
                    resolutionState={engine.resolutionState}
                    nextTransition={engine.nextTransition}
                    eliminatedPlayers={engine.eliminatedPlayers}
                    mode={soloModeActive ? 'solo' : 'standard'}
                  />
                ) : null}
              </>
            </MainStage>
          )}
          side={gameplaySidePanel}
          actionBar={gameplayActionBar}
        />
      ) : null}

      {engine.phase === GamePhase.GAME_OVER ? (
        <AppShell
          mode="game"
          header={(
            <AppHeader
              title={appTitle}
              eyebrow={shellEyebrow}
              status={shellStatus}
              languageControl={languageControl}
              utilityArea={utilityArea}
            />
          )}
          main={(
            <MainStage>
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
            </MainStage>
          )}
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

