import { useCallback, useEffect, useRef, useState } from 'react';
import AdminConsole from './admin/AdminConsole';
import GameBoard from './components/GameBoard';
import RoundSummary from './components/RoundSummary';
import HomeScreen from './components/home/HomeScreen';
import PlayerJoin from './components/PlayerJoin';
import { getCanAnswer, getCardCategory, getPhaseLabel } from './components/gameplay/gameplayState';
import AppHeader from './components/shell/AppHeader';
import AppShell from './components/shell/AppShell';
import MainStage from './components/shell/MainStage';
import SidePanel from './components/shell/SidePanel';
import { useAudioFeedback } from './audio/useAudioFeedback';
import { MAX_PLAYERS_PER_ROOM } from './constants/runtime';
import {
  buildPlayerJoinUrl,
  getRoomLifecycle,
  getSelectedRoomPlayerNames,
  normalizeRoomCodeInput
} from './roomRuntime';
import { useServerGameEngine } from './state/useServerGameEngine';
import {
  loadOrCreatePlayerProfile,
  savePlayerProfile
} from './state/playerProfile';
import { DEFAULT_LANGS, GamePhase } from './state/types';
import {
  ADMIN_CONSOLE_ENABLED,
  ENTRY_ROUTE,
  SOLO_PLAYER_NAME,
  STARTUP_PHASE,
  STRINGS
} from './app/appConfig';
import {
  isDeckExhaustedMessage,
  isSupportedTheme,
  parsePlayers,
  resolvePlanLimit,
  formatSubscriptionStatus,
  formatAuditAction,
  deriveRecentHostedSessions,
  buildHostWorkspaceAnalytics,
  buildRecentHostedSessionTemplateInput,
  resolveSessionReviewNote,
  formatSessionReviewNotePreview
} from './app/appSessionUtils';
import {
  isAdminConsoleRoute,
  loadStoredConfig,
  loadStoredRoomSession,
  resolveBillingReturnState
} from './app/appPersistence';
import { useHostedSessionHistory } from './app/useHostedSessionHistory';
import { useAppShellLifecycle } from './app/useAppShellLifecycle';
import { useGameplayFlow } from './app/useGameplayFlow';
import { useRoomSessionFlow } from './app/useRoomSessionFlow';
import { useRuntimeWorkspace } from './app/useRuntimeWorkspace';
import {
  AdminConsoleDisabled,
  BuildBadge,
  OnboardingPanel,
  PublicLaunchPanel,
  SignInPanel,
  StartScreen,
  StartupStatePanel
} from './app/AppPanels';
import { ActiveGameView, GameOverView, SetupPhaseView } from './app/GameAppViews';
import {
  GameplayActionBarSection,
  GameplaySidePanelSection,
  HostEntryPanelSection,
  HostLanguageControl,
  HostLobbySupportPanelSection,
  HostRuntimePanelsSection,
  HostUtilityArea,
  JoinEntryPanelSection,
  LaunchConsolePanelSection,
  SetupActionBarSection,
  SharedRoomPanelSection
} from './app/AppShellSections';

function GameApp() {
  const storedConfig = loadStoredConfig();
  const storedRoomSession = loadStoredRoomSession();
  const billingReturnState = resolveBillingReturnState();
  const [config, setConfig] = useState({
    topic: storedConfig?.topic ?? '',
    difficulty: storedConfig?.difficulty ?? '2',
    lang: storedConfig?.lang ?? 'en',
    theme: storedConfig?.theme ?? 'classic',
    playersText: storedConfig?.playersText ?? ''
  });
  const [setupPlayerDraft, setSetupPlayerDraft] = useState('');
  const [playerProfile, setPlayerProfile] = useState(() => loadOrCreatePlayerProfile());
  const {
    entryRoute,
    setEntryRoute,
    loadTopics,
    playerJoinRoute,
    setPlayerJoinRoute,
    startup,
    topics
  } = useAppShellLifecycle({
    config,
    setConfig
  });

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
  const activePlayerRouteRoomCode = String(playerJoinRoute || '').trim();
  const {
    runtimeSnapshot,
    runtimeWarning,
    setRuntimeWarning,
    onboardingDraft,
    setOnboardingDraft,
    signInDraft,
    setSignInDraft,
    onboardingPending,
    onboardingError,
    onboardingSuccess,
    signInPending,
    signInError,
    signInSuccess,
    checkoutPending,
    checkoutMessage,
    checkoutUrl,
    brandingDraft,
    brandingPending,
    brandingMessage,
    brandingError,
    sessionTemplates,
    sessionTemplateDraft,
    sessionTemplatePending,
    sessionTemplateMessage,
    setSessionTemplateMessage,
    sessionTemplateError,
    setSessionTemplateError,
    sessionReviewNotes,
    workspaceInsights,
    workspacePending,
    setWorkspacePending,
    workspaceMessage,
    setWorkspaceMessage,
    workspaceError,
    setWorkspaceError,
    reviewedHostedSession,
    setReviewedHostedSession,
    reviewedHostedSessionNote,
    reviewedHostedSessionNoteMessage,
    activeHostedSession,
    setActiveHostedSession,
    hostedSessionFilter,
    setHostedSessionFilter,
    onboardingWorkspaceInputRef,
    signInEmailInputRef,
    refreshWorkspaceInsights,
    handleOnboardingBootstrap,
    handleSignIn,
    handleLogout,
    handleUpgradeCheckout,
    handleBrandingDraftChange,
    handleSaveBranding,
    handleSessionTemplateDraftChange,
    handleSaveSessionTemplate,
    handleReviewedHostedSessionNoteChange,
    handleSaveReviewedHostedSessionNote,
    handleClearReviewedHostedSessionNote,
    handleDeleteSessionTemplate,
    hostLaunchMessage,
    hostLaunchBlocked
  } = useRuntimeWorkspace({
    billingReturnState,
    config,
    setConfig
  });

  useEffect(() => {
    if (entryRoute !== ENTRY_ROUTE.PLAY) {
      soloLaunchAttemptedRef.current = false;
    }
  }, [entryRoute]);

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
      if (!String(roomDraft.displayName || '').trim() && String(playerProfile.displayName || '').trim()) {
        setRoomDraft((current) => ({
          ...current,
          displayName: String(current.displayName || '').trim() ? current.displayName : playerProfile.displayName
        }));
      }
      window.location.hash = '#/join';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.PLAY) {
      if (
        startup.phase === STARTUP_PHASE.READY
        && !roomSession
        && !activePlayerRouteRoomCode
        && serverEngine.phase === GamePhase.SETUP
      ) {
        handleStartSoloMode();
        return;
      }
      window.location.hash = '#/play';
      return;
    }
    if (nextRoute === ENTRY_ROUTE.HOST) {
      window.location.hash = '#/host';
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

  function handleExitHostMode() {
    serverEngine.clearError();
    if (roomSession?.role === 'host') {
      handleClearRoom();
    }
    handleNavigateEntry(ENTRY_ROUTE.HOME);
  }

  function handleOpenSoloSetup() {
    const nextSoloName = String(playerProfile?.displayName || SOLO_PLAYER_NAME).trim() || SOLO_PLAYER_NAME;
    if (!String(setupPlayerDraft || '').trim() && parsePlayers(config.playersText).length === 0) {
      setSetupPlayerDraft(nextSoloName);
    }
    handleNavigateEntry(ENTRY_ROUTE.START);
  }

  const appTitle = String(runtimeSnapshot?.branding?.branding?.appName || STRINGS.title).trim() || STRINGS.title;
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

  const launchRound = useCallback(async ({
    playersText = config.playersText,
    topic = config.topic,
    language = config.lang,
    mode = 'standard',
    winCondition = 30,
    roomCode = null,
    roomPlayerId = null,
    roomAuthToken = null
  } = {}) => {
    if (hostLaunchBlocked) {
      setRuntimeWarning(hostLaunchMessage || STRINGS.hostedRuntimeBlocked);
      return {
        players: [],
        started: false,
        errorMessage: hostLaunchMessage || STRINGS.hostedRuntimeBlocked
      };
    }
    const parsedPlayers = parsePlayers(playersText);
    serverEngine.clearError();
    return serverEngine.startRound({
      players: parsedPlayers,
      language,
      topic: topic || undefined,
      winCondition,
      mode,
      roomCode,
      roomPlayerId,
      roomAuthToken
    });
  }, [config.lang, config.playersText, config.topic, hostLaunchBlocked, hostLaunchMessage, serverEngine, setRuntimeWarning]);
  const {
    playerRoutePreview,
    playerRoutePending,
    playerRouteError,
    playerRouteMessage,
    playerRouteDisplayName,
    setPlayerRouteDisplayName,
    roomDraft,
    setRoomDraft,
    roomPending,
    roomMessage,
    roomError,
    setRoomError,
    roomSession,
    selectedRoomPlayerNames,
    handleCreateRoom,
    handleCreateHostRoom,
    handleJoinRoom,
    handlePlayerRouteJoin,
    handleExitPlayerRoute,
    handleResumeRoom,
    handleClearRoom,
    handleToggleRoomPlayer,
    handleStartRoomSession,
    handleStartHostedGame,
    handleRemoveRoomPlayer,
    handleTrimRoomToSelectedPlayers
  } = useRoomSessionFlow({
    storedRoomSession,
    activePlayerRouteRoomCode,
    playerProfile,
    onboardingDraft,
    runtimeSnapshot,
    config,
    setConfig,
    launchRound,
    serverEngine,
    setEntryRoute,
    setPlayerJoinRoute
  });
  const playerRouteMatchesSavedPlayerSession = roomSession?.role === 'player'
    && normalizeRoomCodeInput(roomSession?.roomCode) === activePlayerRouteRoomCode
    && (!playerRoutePreview || getRoomLifecycle(playerRoutePreview) === getRoomLifecycle(roomSession));
  const {
    canLaunchRecentHostedSessions,
    handleUseRecentHostedSession,
    handleReviewRecentHostedSession,
    handleResumeRecentHostedSession,
    handleLaunchRecentHostedSession
  } = useHostedSessionHistory({
    config,
    setConfig,
    roomSession,
    reviewedHostedSession,
    setReviewedHostedSession,
    setActiveHostedSession,
    setWorkspaceError,
    setWorkspacePending,
    setWorkspaceMessage,
    launchRound,
    clearRoom: handleClearRoom,
    serverEngine
  });

  const {
    activeError,
    soloModeActive,
    controlsDisabled,
    handleStartRound,
    handlePlayAgain,
    handleRestart,
    handleStartSoloMode,
    handleExitSoloMode,
    handlePlayerProfileNameChange
  } = useGameplayFlow({
    config,
    entryRoute,
    startupPhase: startup.phase,
    roomSession,
    activePlayerRouteRoomCode,
    serverEngine,
    launchRound,
    resolvedSoloPlayerName,
    setPlayerProfile,
    refreshWorkspaceInsights,
    runtimeTenantId: runtimeSnapshot?.me?.selectedTenantId,
    handleNavigateEntry,
    soloLaunchAttemptedRef,
    processedSoloResolutionRef
  });
  const setupPlayers = parsePlayers(config.playersText);
  const setupDraftPlayers = parsePlayers(setupPlayerDraft);
  const setupMergedPlayerCount = Array.from(new Set([...setupPlayers, ...setupDraftPlayers])).length;
  const hostRoomSession = roomSession?.role === 'host' ? roomSession : null;
  const hostRoomLifecycle = getRoomLifecycle(hostRoomSession);
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
  const showProductHome = !runtimeSnapshot;
  const shellStatus = engine.phase === GamePhase.SETUP
    ? roomSession?.roomCode
      ? `Lobby ${roomSession.roomCode}`
      : tenantId
        ? 'Host setup'
        : 'Pre-show'
    : `Round ${engine.roundNumber}`;
  const shellEyebrow = engine.phase === GamePhase.SETUP
    ? showProductHome && !roomSession
      ? 'Solo setup'
      : 'Host setup'
    : 'Live game';
  const gameplayCategory = getCardCategory(engine.card);
  const gameplayPhaseLabel = getPhaseLabel(engine.phase);
  const gameplayCanAnswer = getCanAnswer(engine.selectedIndexes, controlsDisabled);
  const languageControl = (
    <HostLanguageControl
      languages={DEFAULT_LANGS}
      selectedLanguage={config.lang}
      onSelectLanguage={(lang) => setConfig((prev) => ({ ...prev, lang }))}
    />
  );
  const utilityArea = (
    <HostUtilityArea
      muted={audioMuted}
      volume={audioVolume}
      onToggleMute={toggleAudioMute}
      onVolumeChange={setAudioVolume}
    />
  );
  const sharedRoomPanel = (
    <SharedRoomPanelSection
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
    <LaunchConsolePanelSection
      StartScreenComponent={StartScreen}
      startScreenProps={{
        topics,
        config,
        setConfig,
        onStart: handleStartSetupRound,
        appTitle,
        runtimeSnapshot,
        runtimeWarning,
        roomMessage,
        roomError,
        hostLaunchBlocked,
        playerDraft: setupPlayerDraft,
        onPlayerDraftChange: setSetupPlayerDraft,
        onCommitPlayerDraft: commitSetupPlayers,
        onRemovePlayer: handleRemoveSetupPlayer,
        showStartButton: false
      }}
    />
  );
  const homeEntryPanel = showProductHome ? (
    <HomeScreen
      appTitle={appTitle}
      tagline={STRINGS.homeTagline}
      warning={runtimeWarning}
      profileName={playerProfile.displayName}
      profileLevel={playerProfile.level}
      profileXp={playerProfile.totalXp}
      profileGamesPlayed={playerProfile.gamesPlayed}
      profileRoundsWon={playerProfile.roundsWon}
      onProfileNameChange={handlePlayerProfileNameChange}
      onPlay={() => handleNavigateEntry(ENTRY_ROUTE.PLAY)}
      onChooseTopic={handleOpenSoloSetup}
      onJoinGame={() => handleNavigateEntry(ENTRY_ROUTE.JOIN)}
      onHostGame={() => handleNavigateEntry(ENTRY_ROUTE.HOST)}
    />
  ) : null;
  const joinEntryPanel = (
    <JoinEntryPanelSection
      appTitle={appTitle}
      roomCode={roomDraft.roomCode}
      displayName={roomDraft.displayName || playerProfile.displayName}
      pending={roomPending}
      message={roomMessage}
      error={roomError}
      onRoomCodeChange={(event) => setRoomDraft((prev) => ({
        ...prev,
        roomCode: normalizeRoomCodeInput(event.target.value)
      }))}
      onDisplayNameChange={(value) => setRoomDraft((prev) => ({
        ...prev,
        displayName: value
      }))}
      onJoin={handleJoinRoom}
      onBack={() => handleNavigateEntry(ENTRY_ROUTE.HOME)}
    />
  );
  const playerWaitingShell = roomSession?.role === 'player' ? sharedRoomPanel : null;
  const hostEntryPanel = (
    <HostEntryPanelSection
      appTitle={appTitle}
      topics={topics}
      selectedTopic={config.topic}
      hostName={roomDraft.displayName || playerProfile.displayName}
      roomSession={hostRoomSession}
      pending={roomPending}
      message={roomMessage}
      error={roomError || (entryRoute === ENTRY_ROUTE.HOST ? activeError : '')}
      onTopicChange={(topic) => {
        setConfig((prev) => ({ ...prev, topic }));
        setRoomError('');
        serverEngine.clearError();
      }}
      onHostNameChange={(value) => {
        setRoomDraft((prev) => ({ ...prev, displayName: value }));
        setRoomError('');
      }}
      onCreateRoom={handleCreateHostRoom}
      onStartGame={handleStartHostedGame}
      onBack={handleExitHostMode}
    />
  );
  const setupActionBar = (
    <SetupActionBarSection
      roomSession={roomSession}
      hostRoomSession={hostRoomSession}
      setupMergedPlayerCount={setupMergedPlayerCount}
      selectedRoomPlayers={selectedRoomPlayers}
      roomPlayerCount={roomPlayerCount}
      roomPending={roomPending}
      hostLaunchBlocked={hostLaunchBlocked}
      setupOverHostedPlayerCap={setupOverHostedPlayerCap}
      hostRoomLifecycle={hostRoomLifecycle}
      strings={STRINGS}
      onStartSetupRound={handleStartSetupRound}
      onStartRoomSession={handleStartRoomSession}
    />
  );
  const hostLobbySupportPanel = hostRoomSession ? (
    <HostLobbySupportPanelSection
      roomCode={hostRoomSession.roomCode}
      joinLink={buildPlayerJoinUrl(hostRoomSession.roomCode)}
      onResumeRoom={handleResumeRoom}
      pending={roomPending}
      onBackHome={() => {
        handleClearRoom();
        handleNavigateEntry(ENTRY_ROUTE.HOME);
      }}
    />
  ) : null;
  const hostRuntimePanels = (
    <HostRuntimePanelsSection
      runtimeSnapshot={runtimeSnapshot}
      roomSession={roomSession}
      appTitle={appTitle}
      planCode={planCode}
      planStatus={planStatus}
      checkoutPending={checkoutPending}
      checkoutMessage={checkoutMessage}
      checkoutUrl={checkoutUrl}
      handleLogout={handleLogout}
      canUpgrade={canUpgrade}
      handleUpgradeCheckout={handleUpgradeCheckout}
      hostLaunchBlocked={hostLaunchBlocked}
      strings={STRINGS}
      maxHostedPlayers={maxHostedPlayers}
      planLimit={planLimit}
      analyticsHistoryEnabled={analyticsHistoryEnabled}
      usageRow={usageRow}
      workspacePending={workspacePending}
      workspaceError={workspaceError}
      workspaceMessage={workspaceMessage}
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
      setupMergedPlayerCount={setupMergedPlayerCount}
      canManageBrandingRole={canManageBrandingRole}
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
  const showSetupSidePanel = !(showProductHome && !roomSession && entryRoute === ENTRY_ROUTE.START);
  const gameplaySidePanel = soloModeActive ? null : (
    <GameplaySidePanelSection
      engine={engine}
      activeError={activeError}
      soloModeActive={soloModeActive}
      playerProfile={playerProfile}
      gameplayPhaseLabel={gameplayPhaseLabel}
    />
  );
  const gameplayActionBar = (
    <GameplayActionBarSection
      engine={engine}
      gameplayCategory={gameplayCategory}
      controlsDisabled={controlsDisabled}
      gameplayCanAnswer={gameplayCanAnswer}
      hostRoomSession={hostRoomSession}
      onRestart={handleRestart}
    />
  );

  return (
    <main className="host-app" data-phase={engine.phase === GamePhase.SETUP ? 'setup' : 'game'}>
      <BuildBadge />
      {engine.phase === GamePhase.SETUP ? (
        <SetupPhaseView
          activePlayerRouteRoomCode={activePlayerRouteRoomCode}
          playerRouteMatchesSavedPlayerSession={playerRouteMatchesSavedPlayerSession}
          playerWaitingShell={playerWaitingShell}
          playerJoinElement={(
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
          )}
          startup={startup}
          startupReady={startup.phase === STARTUP_PHASE.READY}
          topics={topics}
          showProductHome={showProductHome}
          entryRoute={entryRoute}
          homeRoute={ENTRY_ROUTE.HOME}
          joinRoute={ENTRY_ROUTE.JOIN}
          hostRoute={ENTRY_ROUTE.HOST}
          hostTrialRoute={ENTRY_ROUTE.HOST_TRIAL}
          hostSignInRoute={ENTRY_ROUTE.HOST_SIGNIN}
          startRoute={ENTRY_ROUTE.START}
          roomSession={roomSession}
          startupStateElement={<StartupStatePanel startup={startup} onRetry={loadTopics} appTitle={appTitle} />}
          homeEntryPanel={homeEntryPanel}
          joinEntryPanel={joinEntryPanel}
          hostEntryPanel={hostEntryPanel}
          onboardingPanel={(
            <OnboardingPanel
              draft={onboardingDraft}
              pending={onboardingPending}
              success={onboardingSuccess}
              error={onboardingError}
              onDraftChange={setOnboardingDraft}
              onSubmit={handleOnboardingBootstrap}
              workspaceInputRef={onboardingWorkspaceInputRef}
            />
          )}
          signInPanel={(
            <SignInPanel
              draft={signInDraft}
              pending={signInPending}
              success={signInSuccess}
              error={signInError}
              onDraftChange={setSignInDraft}
              onSubmit={handleSignIn}
              emailInputRef={signInEmailInputRef}
            />
          )}
          setupShell={(
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
              side={showSetupSidePanel ? <SidePanel>{setupSideStack}</SidePanel> : null}
              actionBar={setupActionBar}
            />
          )}
        />
      ) : null}

      {engine.phase !== GamePhase.SETUP && engine.phase !== GamePhase.GAME_OVER ? (
        <ActiveGameView
          appTitle={appTitle}
          shellEyebrow={shellEyebrow}
          shellStatus={shellStatus}
          languageControl={languageControl}
          utilityArea={utilityArea}
          loadingPanel={engine.phase === GamePhase.LOADING_CARD ? (
            <section className="board-surface card-loading-panel" data-testid="card-loading-panel">
              <p>{STRINGS.loadingCard}</p>
              <div className="card-loading-skeleton" aria-hidden />
            </section>
          ) : null}
          errorPanel={activeError ? (
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
          gameBoard={engine.card ? (
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
              sessionXp={engine.sessionXp}
              lastRoundXp={engine.lastRoundXp}
              profileName={playerProfile.displayName}
              profileLevel={playerProfile.level}
              profileXp={playerProfile.totalXp}
              profileGamesPlayed={playerProfile.gamesPlayed}
            />
          ) : null}
          gameplaySidePanel={gameplaySidePanel}
          gameplayActionBar={gameplayActionBar}
        />
      ) : null}

      {engine.phase === GamePhase.GAME_OVER ? (
        <GameOverView
          appTitle={appTitle}
          shellEyebrow={shellEyebrow}
          shellStatus={shellStatus}
          languageControl={languageControl}
          utilityArea={utilityArea}
          roundSummary={(
            <RoundSummary
              players={engine.players}
              scores={engine.scores}
              stats={engine.stats}
              roundNumber={engine.roundNumber}
              mode={soloModeActive ? 'solo' : 'standard'}
              sessionXp={engine.sessionXp}
              lastRoundXp={engine.lastRoundXp}
              profileName={playerProfile.displayName}
              profileLevel={playerProfile.level}
              profileXp={playerProfile.totalXp}
              profileGamesPlayed={playerProfile.gamesPlayed}
              profileRoundsWon={playerProfile.roundsWon}
              onNextRound={engine.nextStep}
              onRestart={handleRestart}
              onPlayAgain={handlePlayAgain}
              winner={engine.winner}
            />
          )}
        />
      ) : null}
    </main>
  );
}

export default function App() {
  if (isAdminConsoleRoute()) {
    if (ADMIN_CONSOLE_ENABLED) {
      return <AdminConsole />;
    }
    return <AdminConsoleDisabled />;
  }
  return <GameApp />;
}

