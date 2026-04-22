import { useCallback, useEffect, useState } from 'react';
import {
  createRoomSession,
  fetchRoomPreview,
  joinRoomSession,
  rejoinRoomSession,
  removeRoomPlayerFromSession,
  resolveRoomSessionErrorMessage
} from '../api';
import {
  getRoomLifecycle,
  getRoomPlayerNames,
  getSelectedRoomPlayerNames,
  isRoomJoinable,
  normalizePlayerName,
  normalizeRoomCodeInput
} from '../roomRuntime';
import {
  loadStoredRoomSelection,
  navigateToRoomJoinRoute,
  persistRoomSelection,
  persistRoomSession
} from './appPersistence';
import { ENTRY_ROUTE, STRINGS } from './appConfig';
import { shouldClearRoomSessionAfterResumeFailure } from './appSessionUtils';

export function useRoomSessionFlow({
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
}) {
  const [playerRoutePreview, setPlayerRoutePreview] = useState(null);
  const [playerRoutePending, setPlayerRoutePending] = useState(false);
  const [playerRouteError, setPlayerRouteError] = useState('');
  const [playerRouteMessage, setPlayerRouteMessage] = useState('');
  const [playerRouteDisplayName, setPlayerRouteDisplayName] = useState('');
  const [roomDraft, setRoomDraft] = useState({
    displayName: storedRoomSession?.displayName || '',
    roomCode: storedRoomSession?.roomCode || ''
  });
  const [roomPending, setRoomPending] = useState(false);
  const [roomMessage, setRoomMessage] = useState('');
  const [roomError, setRoomError] = useState('');
  const [roomSession, setRoomSession] = useState(storedRoomSession);
  const [selectedRoomPlayerNames, setSelectedRoomPlayerNames] = useState(() => getRoomPlayerNames(storedRoomSession));

  const resetToHomeRoute = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = '';
    }
    setEntryRoute(ENTRY_ROUTE.HOME);
    setPlayerJoinRoute(null);
    setPlayerRoutePreview(null);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
  }, [setEntryRoute, setPlayerJoinRoute]);

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
    if (roomSession?.role !== 'host' || !roomSession?.roomCode) {
      return;
    }
    persistRoomSelection(roomSession.roomCode, selectedRoomPlayerNames);
  }, [roomSession, selectedRoomPlayerNames]);

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

  const handleCreateRoom = useCallback(async () => {
    if (roomPending) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const fallbackDisplayName = runtimeSnapshot?.me?.displayName
        || playerProfile.displayName
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
      setRoomError(resolveRoomSessionErrorMessage(error, { action: 'create' }));
    } finally {
      setRoomPending(false);
    }
  }, [applyRoomSession, onboardingDraft.ownerDisplayName, playerProfile.displayName, roomDraft.displayName, roomPending, runtimeSnapshot?.me?.displayName]);

  const handleCreateHostRoom = useCallback(async () => {
    if (!String(config.topic || '').trim()) {
      setRoomError(STRINGS.hostTopicRequired);
      setRoomMessage('');
      return;
    }
    serverEngine.clearError();
    await handleCreateRoom();
  }, [config.topic, handleCreateRoom, serverEngine]);

  const handleJoinRoom = useCallback(async () => {
    if (roomPending) {
      return;
    }
    setRoomPending(true);
    setRoomError('');
    setRoomMessage('');
    try {
      const roomCode = normalizeRoomCodeInput(roomDraft.roomCode);
      const displayName = String(roomDraft.displayName || playerProfile.displayName || '').trim();
      if (!roomCode) {
        throw { code: 'VALIDATION_ERROR', message: 'roomCode is required' };
      }
      if (!displayName) {
        throw { code: 'VALIDATION_ERROR', message: 'displayName is required' };
      }
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
      navigateToRoomJoinRoute(resumed.roomCode);
    } catch (error) {
      setRoomError(resolveRoomSessionErrorMessage(error, { action: 'join' }));
    } finally {
      setRoomPending(false);
    }
  }, [applyRoomSession, playerProfile.displayName, roomDraft.displayName, roomDraft.roomCode, roomPending]);

  const handlePlayerRouteJoin = useCallback(async () => {
    if (!activePlayerRouteRoomCode || roomPending) {
      return;
    }
    setRoomPending(true);
    setPlayerRouteError('');
    setPlayerRouteMessage('');
    try {
      if (playerRoutePreview && !isRoomJoinable(playerRoutePreview)) {
        throw { code: 'ROOM_CLOSED' };
      }
      const displayName = String(playerRouteDisplayName || roomDraft.displayName || playerProfile.displayName || '').trim();
      if (!displayName) {
        throw { code: 'VALIDATION_ERROR', message: 'displayName is required' };
      }
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
      navigateToRoomJoinRoute(resumed.roomCode);
    } catch (error) {
      setPlayerRouteError(resolveRoomSessionErrorMessage(error, { action: 'join' }));
    } finally {
      setRoomPending(false);
    }
  }, [activePlayerRouteRoomCode, applyRoomSession, playerProfile.displayName, playerRouteDisplayName, playerRoutePreview, roomDraft.displayName, roomPending]);

  const handleExitPlayerRoute = useCallback(() => {
    resetToHomeRoute();
  }, [resetToHomeRoute]);

  const handleResumeRoom = useCallback(async () => {
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
      const resolvedMessage = resolveRoomSessionErrorMessage(error, { action: 'resume' });
      const shouldClearSession = shouldClearRoomSessionAfterResumeFailure(error);
      if (shouldClearSession) {
        persistRoomSelection(roomSession?.roomCode, []);
        persistRoomSession(null);
        setRoomSession(null);
        setSelectedRoomPlayerNames([]);
        if (roomSession?.role === 'player' && activePlayerRouteRoomCode) {
          setPlayerRouteError(resolvedMessage);
          setRoomError('');
        } else {
          setRoomError(resolvedMessage);
        }
      } else {
        setRoomError(resolvedMessage);
      }
    } finally {
      setRoomPending(false);
    }
  }, [activePlayerRouteRoomCode, applyRoomSession, roomPending, roomSession]);

  const handleClearRoom = useCallback(() => {
    const returningFromPlayerRoom = roomSession?.role === 'player';
    persistRoomSelection(roomSession?.roomCode, []);
    setRoomSession(null);
    persistRoomSession(null);
    setSelectedRoomPlayerNames([]);
    setRoomMessage('');
    setRoomError('');
    if (returningFromPlayerRoom) {
      resetToHomeRoute();
    }
  }, [resetToHomeRoute, roomSession]);

  const handleToggleRoomPlayer = useCallback((playerName) => {
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
  }, []);

  const handleStartRoomSession = useCallback(async () => {
    const roomPlayerNames = getSelectedRoomPlayerNames(roomSession, selectedRoomPlayerNames);
    if (roomPlayerNames.length === 0) {
      setRoomError(STRINGS.roomSelectedRosterEmpty);
      return [];
    }
    setConfig((prev) => ({
      ...prev,
      playersText: roomPlayerNames.join(', ')
    }));
    setRoomMessage(`${STRINGS.roomSelectedRosterStartPrefix} ${roomPlayerNames.join(', ')}`);
    const launchResult = await launchRound({
      playersText: roomPlayerNames.join(', '),
      topic: config.topic,
      language: config.lang,
      roomCode: roomSession?.roomCode,
      roomPlayerId: roomSession?.playerId,
      roomAuthToken: roomSession?.authToken
    });
    if (!launchResult?.started) {
      setRoomMessage('');
      let refreshedPreview = null;
      if (roomSession?.roomCode) {
        try {
          refreshedPreview = await fetchRoomPreview(roomSession.roomCode);
          applyRoomSession({
            ...roomSession,
            roomState: refreshedPreview
          }, '');
        } catch {
          // Keep the existing host lobby visible even if preview refresh fails.
        }
      }
      if (refreshedPreview && !isRoomJoinable(refreshedPreview)) {
        setRoomError(STRINGS.roomAlreadyLive);
      } else if (launchResult?.errorMessage) {
        setRoomError(launchResult.errorMessage);
      }
      return [];
    }
    const launchedPlayers = launchResult.players;
    if (launchedPlayers.length > 0 && roomSession?.roomCode) {
      try {
        const nextRoomState = await fetchRoomPreview(roomSession.roomCode);
        applyRoomSession({
          ...roomSession,
          roomState: nextRoomState
        }, `${STRINGS.roomSelectedRosterStartPrefix} ${roomPlayerNames.join(', ')}`);
      } catch {
        // Keep the host game running even if room preview refresh fails.
      }
    }
    return launchedPlayers;
  }, [applyRoomSession, config.lang, config.topic, launchRound, roomSession, selectedRoomPlayerNames, setConfig]);

  const handleStartHostedGame = useCallback(() => {
    if (roomPending) {
      return;
    }
    if (roomSession?.role !== 'host' || !roomSession?.roomCode) {
      setRoomError(STRINGS.hostRoomRequired);
      return;
    }
    if (!String(config.topic || '').trim()) {
      setRoomError(STRINGS.hostStartTopicRequired);
      return;
    }
    serverEngine.clearError();
    setRoomError('');
    handleStartRoomSession();
  }, [config.topic, handleStartRoomSession, roomPending, roomSession, serverEngine]);

  const handleRemoveRoomPlayer = useCallback(async (player) => {
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
  }, [applyRoomSession, roomPending, roomSession]);

  const handleTrimRoomToSelectedPlayers = useCallback(async () => {
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
  }, [applyRoomSession, roomPending, roomSession, selectedRoomPlayerNames]);

  return {
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
    setSelectedRoomPlayerNames,
    applyRoomSession,
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
  };
}
