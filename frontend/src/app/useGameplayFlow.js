import { useCallback, useEffect, useRef } from 'react';
import {
  getDailyChallengeDateKey,
  recordDailyChallengeResult,
  recordDailyChallengeStarted,
  recordSoloGameStarted,
  recordSoloRoundResult,
  updatePlayerProfileDisplayName
} from '../state/playerProfile';
import { PLAYER_ANALYTICS_EVENT } from '../state/playerAnalytics';
import { GamePhase } from '../state/types';
import { ENTRY_ROUTE, SOLO_WIN_CONDITION, STARTUP_PHASE } from './appConfig';

const GAME_MODE_DAILY = 'daily';
const GAME_MODE_SOLO = 'solo';

function isSoloProfileMode(mode) {
  return mode === GAME_MODE_SOLO || mode === GAME_MODE_DAILY;
}

export function useGameplayFlow({
  config,
  entryRoute,
  startupPhase,
  roomSession,
  activePlayerRouteRoomCode,
  serverEngine,
  launchRound,
  playerProfile,
  resolvedSoloPlayerName,
  setPlayerProfile,
  trackPlayerEvent,
  refreshWorkspaceInsights,
  runtimeTenantId,
  handleNavigateEntry,
  soloLaunchAttemptedRef,
  processedSoloResolutionRef
}) {
  const dailyChallengeDateRef = useRef('');

  const handleStartRound = useCallback((playersTextOverride = null) => {
    launchRound({
      playersText: playersTextOverride ?? config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }, [config.lang, config.playersText, config.topic, launchRound]);

  const handleStartSoloMode = useCallback(() => {
    processedSoloResolutionRef.current = '';
    if (Number(playerProfile?.gamesPlayed || 0) > 0) {
      trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.REPLAY, {
        mode: GAME_MODE_SOLO,
        trigger: 'home_play'
      });
    }
    trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.RUN_START, {
      mode: GAME_MODE_SOLO,
      trigger: 'home_play'
    });
    setPlayerProfile((prev) => recordSoloGameStarted(prev));
    launchRound({
      playersText: resolvedSoloPlayerName,
      topic: '',
      language: 'en',
      mode: 'solo',
      winCondition: SOLO_WIN_CONDITION
    });
  }, [launchRound, playerProfile?.gamesPlayed, processedSoloResolutionRef, resolvedSoloPlayerName, setPlayerProfile, trackPlayerEvent]);

  const handleStartDailyChallenge = useCallback(() => {
    const dateKey = getDailyChallengeDateKey();
    dailyChallengeDateRef.current = dateKey;
    processedSoloResolutionRef.current = '';
    trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.RUN_START, {
      mode: GAME_MODE_DAILY,
      trigger: 'daily_challenge',
      date: dateKey
    });
    setPlayerProfile((prev) => recordDailyChallengeStarted(prev, dateKey));
    launchRound({
      playersText: resolvedSoloPlayerName,
      topic: '',
      language: 'en',
      mode: GAME_MODE_DAILY,
      winCondition: SOLO_WIN_CONDITION
    });
  }, [launchRound, processedSoloResolutionRef, resolvedSoloPlayerName, setPlayerProfile, trackPlayerEvent]);

  const handlePlayAgain = useCallback(() => {
    if (serverEngine.gameMode === GAME_MODE_SOLO) {
      processedSoloResolutionRef.current = '';
      trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.REPLAY, {
        mode: GAME_MODE_SOLO,
        trigger: 'play_again'
      });
      trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.RUN_START, {
        mode: GAME_MODE_SOLO,
        trigger: 'play_again'
      });
      setPlayerProfile((prev) => recordSoloGameStarted(prev));
      launchRound({
        playersText: resolvedSoloPlayerName,
        topic: '',
        language: 'en',
        mode: GAME_MODE_SOLO,
        winCondition: SOLO_WIN_CONDITION
      });
      return;
    }
    trackPlayerEvent?.(PLAYER_ANALYTICS_EVENT.REPLAY, {
      mode: serverEngine.gameMode || 'standard',
      trigger: 'play_again'
    });
    launchRound({
      playersText: config.playersText,
      topic: config.topic,
      language: config.lang
    });
  }, [config.lang, config.playersText, config.topic, launchRound, processedSoloResolutionRef, resolvedSoloPlayerName, serverEngine.gameMode, setPlayerProfile, trackPlayerEvent]);

  const handleRestart = useCallback(() => {
    const wasSoloMode = isSoloProfileMode(serverEngine.gameMode);
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
    if (!isSoloProfileMode(serverEngine.gameMode)) {
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
    const resultInput = {
      xpGained: serverEngine.resolutionState?.xpGained ?? 0,
      sessionXp: serverEngine.resolutionState?.totalXp ?? serverEngine.sessionXp ?? 0,
      wasSuccessful: serverEngine.phase === GamePhase.ROUND_SUCCESS
    };
    trackPlayerEvent?.(
      resultInput.wasSuccessful ? PLAYER_ANALYTICS_EVENT.ROUND_WIN : PLAYER_ANALYTICS_EVENT.ROUND_FAIL,
      {
        mode: serverEngine.gameMode,
        roundNumber: serverEngine.roundNumber,
        roundXp: resultInput.xpGained,
        sessionXp: resultInput.sessionXp
      }
    );
    setPlayerProfile((prev) => {
      if (serverEngine.gameMode === GAME_MODE_DAILY) {
        return recordDailyChallengeResult(prev, {
          ...resultInput,
          dateKey: dailyChallengeDateRef.current || getDailyChallengeDateKey()
        });
      }
      return recordSoloRoundResult(prev, resultInput);
    });
  }, [processedSoloResolutionRef, serverEngine.gameMode, serverEngine.phase, serverEngine.resolutionState, serverEngine.roundNumber, serverEngine.sessionXp, setPlayerProfile, trackPlayerEvent]);

  return {
    activeError: serverEngine.errorMessage,
    soloModeActive: isSoloProfileMode(serverEngine.gameMode),
    dailyModeActive: serverEngine.gameMode === GAME_MODE_DAILY,
    controlsDisabled: !serverEngine.isLocalTurn,
    handleStartRound,
    handlePlayAgain,
    handleRestart,
    handleStartSoloMode,
    handleStartDailyChallenge,
    handleExitSoloMode,
    handlePlayerProfileNameChange
  };
}
