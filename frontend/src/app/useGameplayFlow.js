import { useCallback, useEffect } from 'react';
import { recordSoloGameStarted, recordSoloRoundResult, updatePlayerProfileDisplayName } from '../state/playerProfile';
import { GamePhase } from '../state/types';
import { ENTRY_ROUTE, SOLO_WIN_CONDITION, STARTUP_PHASE } from './appConfig';

export function useGameplayFlow({
  config,
  entryRoute,
  startupPhase,
  roomSession,
  activePlayerRouteRoomCode,
  serverEngine,
  launchRound,
  resolvedSoloPlayerName,
  setPlayerProfile,
  refreshWorkspaceInsights,
  runtimeTenantId,
  handleNavigateEntry,
  soloLaunchAttemptedRef,
  processedSoloResolutionRef
}) {
  const handleStartRound = useCallback((playersTextOverride = null) => {
    launchRound({
      playersText: playersTextOverride ?? config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }, [config.lang, config.playersText, config.topic, launchRound]);

  const handleStartSoloMode = useCallback(() => {
    processedSoloResolutionRef.current = '';
    setPlayerProfile((prev) => recordSoloGameStarted(prev));
    launchRound({
      playersText: resolvedSoloPlayerName,
      topic: '',
      language: 'en',
      mode: 'solo',
      winCondition: SOLO_WIN_CONDITION
    });
  }, [launchRound, processedSoloResolutionRef, resolvedSoloPlayerName, setPlayerProfile]);

  const handlePlayAgain = useCallback(() => {
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
  }, [config.lang, config.playersText, config.topic, launchRound, processedSoloResolutionRef, resolvedSoloPlayerName, serverEngine.gameMode, setPlayerProfile]);

  const handleRestart = useCallback(() => {
    const wasSoloMode = serverEngine.gameMode === 'solo';
    serverEngine.resetToSetup();
    serverEngine.clearError();
    processedSoloResolutionRef.current = '';
    if (wasSoloMode) {
      handleNavigateEntry(ENTRY_ROUTE.HOME);
      return;
    }
    if (runtimeTenantId) {
      refreshWorkspaceInsights();
    }
  }, [handleNavigateEntry, processedSoloResolutionRef, refreshWorkspaceInsights, runtimeTenantId, serverEngine]);

  const handleExitSoloMode = useCallback(() => {
    serverEngine.resetToSetup();
    serverEngine.clearError();
    processedSoloResolutionRef.current = '';
    handleNavigateEntry(ENTRY_ROUTE.HOME);
  }, [handleNavigateEntry, processedSoloResolutionRef, serverEngine]);

  const handlePlayerProfileNameChange = useCallback((nextName) => {
    setPlayerProfile((prev) => updatePlayerProfileDisplayName(prev, nextName));
  }, [setPlayerProfile]);

  useEffect(() => {
    if (entryRoute !== ENTRY_ROUTE.PLAY) {
      return;
    }
    if (startupPhase !== STARTUP_PHASE.READY) {
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
  }, [
    activePlayerRouteRoomCode,
    entryRoute,
    handleStartSoloMode,
    roomSession,
    serverEngine.phase,
    soloLaunchAttemptedRef,
    startupPhase
  ]);

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
  }, [processedSoloResolutionRef, serverEngine.gameMode, serverEngine.phase, serverEngine.resolutionState, serverEngine.roundNumber, setPlayerProfile]);

  return {
    activeError: serverEngine.errorMessage,
    soloModeActive: serverEngine.gameMode === 'solo',
    controlsDisabled: !serverEngine.isLocalTurn,
    handleStartRound,
    handlePlayAgain,
    handleRestart,
    handleStartSoloMode,
    handleExitSoloMode,
    handlePlayerProfileNameChange
  };
}
