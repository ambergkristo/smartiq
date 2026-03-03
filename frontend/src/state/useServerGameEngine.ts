import { useCallback, useMemo, useState } from 'react';
import {
  createServerGameSession,
  fetchServerGameSession,
  resolveGameSessionErrorMessage,
  sendServerGameAction
} from '../api';
import { DEFAULT_PLAYERS, GamePhase } from './types';

const TARGET_SCORE_DEFAULT = 30;
const READY_LABEL = 'Ready';
const SUPPORTED_GAME_SNAPSHOT_API_VERSION = '1';

function initialScores(players) {
  return players.reduce((acc, player) => {
    acc[player] = 0;
    return acc;
  }, {});
}

function initialStats(players) {
  return players.reduce((acc, player) => {
    acc[player] = { correct: 0, wrong: 0, passes: 0 };
    return acc;
  }, {});
}

function mergeStats(players, stats) {
  const merged = { ...stats };
  players.forEach((player) => {
    if (!merged[player]) {
      merged[player] = { correct: 0, wrong: 0, passes: 0 };
    }
  });
  return merged;
}

function resolveWinner(players, scores, targetScore) {
  let bestPlayer = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  players.forEach((player) => {
    const score = scores[player] ?? 0;
    if (score >= targetScore && score > bestScore) {
      bestPlayer = player;
      bestScore = score;
    }
  });

  return bestPlayer;
}

function normalizePlayers(rawPlayers) {
  if (!Array.isArray(rawPlayers)) {
    return [];
  }

  return rawPlayers
    .map((entry) => String(entry || '').trim())
    .filter(Boolean);
}

function normalizeActionTokens(rawTokens) {
  if (!rawTokens || typeof rawTokens !== 'object' || Array.isArray(rawTokens)) {
    return {};
  }
  return Object.entries(rawTokens).reduce((acc, [playerId, token]) => {
    const normalizedPlayerId = String(playerId || '').trim();
    const normalizedToken = String(token || '').trim();
    if (normalizedPlayerId && normalizedToken) {
      acc[normalizedPlayerId] = normalizedToken;
    }
    return acc;
  }, {});
}

function fallbackActionTokens(snapshot) {
  const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
  return players.reduce((acc, player) => {
    const playerId = String(player?.playerId || '').trim();
    if (playerId) {
      acc[playerId] = `legacy-token-${playerId}`;
    }
    return acc;
  }, {});
}

function safeNumber(value, fallback = 0) {
  return Number.isInteger(value) ? value : fallback;
}

function createActionRequestId() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return `ga_${globalThis.crypto.randomUUID()}`;
  }
  return `ga_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapSnapshot(snapshot, languageFallback, targetScoreFallback) {
  const snapshotApiVersion = String(snapshot?.apiVersion || SUPPORTED_GAME_SNAPSHOT_API_VERSION).trim();
  if (snapshotApiVersion !== SUPPORTED_GAME_SNAPSHOT_API_VERSION) {
    const error = new Error(`Unsupported game session API version: ${snapshotApiVersion}`);
    error.code = 'CONTRACT_MISMATCH';
    throw error;
  }

  const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
  const playerById = new Map();
  const names = players.map((player) => {
    const id = String(player?.playerId || '');
    const displayName = String(player?.displayName || id || 'Player');
    playerById.set(id, displayName);
    return displayName;
  });

  const totalScores = snapshot?.totalScores && typeof snapshot.totalScores === 'object'
    ? snapshot.totalScores
    : {};
  const statuses = snapshot?.statuses && typeof snapshot.statuses === 'object'
    ? snapshot.statuses
    : {};

  const scores = {};
  players.forEach((player) => {
    const id = String(player?.playerId || '');
    const displayName = playerById.get(id) || id;
    scores[displayName] = safeNumber(totalScores[id], 0);
  });

  const eliminatedPlayers = [];
  const passedPlayers = [];
  players.forEach((player) => {
    const id = String(player?.playerId || '');
    const displayName = playerById.get(id) || id;
    const status = String(statuses[id] || 'ACTIVE').toUpperCase();
    if (status === 'OUT') {
      eliminatedPlayers.push(displayName);
    } else if (status === 'PASSED') {
      passedPlayers.push(displayName);
    }
  });

  const rawPegs = Array.isArray(snapshot?.boardState?.pegs) ? snapshot.boardState.pegs : [];
  const pegs = [...rawPegs]
    .filter((peg) => Number.isInteger(peg?.index))
    .sort((a, b) => a.index - b.index);
  const revealedIndexes = [];
  const wrongIndexes = [];
  const pegStateByIndex = new Map();
  const options = pegs.map((peg, idx) => {
    const pegIndex = safeNumber(peg?.index, idx);
    const state = String(peg?.state || 'hidden').toLowerCase();
    pegStateByIndex.set(pegIndex, state);
    if (state === 'revealed') {
      revealedIndexes.push(pegIndex);
    } else if (state === 'wrong') {
      wrongIndexes.push(pegIndex);
    }
    return typeof peg?.value === 'string' && peg.value.trim().length > 0
      ? peg.value
      : `Peg ${pegIndex + 1}`;
  });

  const fallbackOptions = options.length > 0
    ? options
    : Array.from({ length: 10 }, (_, index) => `Peg ${index + 1}`);

  const roundNumber = safeNumber(snapshot?.roundState?.roundNumber, 1);
  const targetScore = safeNumber(snapshot?.winCondition, targetScoreFallback);
  const activePlayerIndex = Math.min(
    Math.max(safeNumber(snapshot?.activePlayerIndex, 0), 0),
    Math.max(names.length - 1, 0)
  );
  const starterPlayerId = String(snapshot?.roundState?.starterPlayerId || '');
  const starterIndex = Math.max(
    0,
    players.findIndex((player) => String(player?.playerId || '') === starterPlayerId)
  );
  const backendPhase = String(snapshot?.roundState?.phase || GamePhase.CHOOSING).toUpperCase();

  return {
    backendPhase,
    roundNumber,
    targetScore,
    players: names.length > 0 ? names : DEFAULT_PLAYERS,
    scores: names.length > 0 ? scores : { [DEFAULT_PLAYERS[0]]: 0 },
    card: {
      id: `${snapshot?.gameId || 'server'}-round-${roundNumber}`,
      cardId: `${snapshot?.gameId || 'server'}-round-${roundNumber}`,
      topic: String(snapshot?.boardState?.topic || ''),
      category: String(snapshot?.boardState?.category || 'OPEN'),
      language: String(languageFallback || 'en'),
      question: String(snapshot?.boardState?.question || ''),
      options: fallbackOptions,
      correct: {}
    },
    revealedIndexes,
    wrongIndexes,
    eliminatedPlayers,
    passedPlayers,
    currentPlayerIndex: activePlayerIndex,
    starterIndex,
    lastAction: String(snapshot?.roundState?.lastAction || READY_LABEL),
    winner: resolveWinner(names, scores, targetScore),
    pegStateByIndex
  };
}

export function useServerGameEngine(targetScore = TARGET_SCORE_DEFAULT) {
  const [phase, setPhase] = useState(GamePhase.SETUP);
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [scores, setScores] = useState({ [DEFAULT_PLAYERS[0]]: 0 });
  const [stats, setStats] = useState(initialStats(DEFAULT_PLAYERS));
  const [roundNumber, setRoundNumber] = useState(0);
  const [card, setCard] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());
  const [selectedRank, setSelectedRank] = useState(null);
  const [revealedIndexes, setRevealedIndexes] = useState(new Set());
  const [wrongIndexes, setWrongIndexes] = useState(new Set());
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  const [passedPlayers, setPassedPlayers] = useState(new Set());
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [starterIndex, setStarterIndex] = useState(0);
  const [lastAction, setLastAction] = useState(READY_LABEL);
  const [winner, setWinner] = useState(null);
  const [effectiveTargetScore, setEffectiveTargetScore] = useState(targetScore);
  const [loadTicket, setLoadTicket] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [queuedSnapshot, setQueuedSnapshot] = useState(null);
  const [queuedTransition, setQueuedTransition] = useState('none');
  const [startRequest, setStartRequest] = useState(null);
  const [language, setLanguage] = useState('en');
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [controlledPlayer, setControlledPlayer] = useState(null);
  const [actionTokensByPlayerId, setActionTokensByPlayerId] = useState({});

  const currentPlayer = players[currentPlayerIndex] ?? players[0] ?? DEFAULT_PLAYERS[0];
  const currentActorPlayerId = String(activeSnapshot?.roundState?.currentPlayerId || '').trim();
  const currentRoundScore = Number.isInteger(activeSnapshot?.roundScores?.[currentActorPlayerId])
    ? activeSnapshot.roundScores[currentActorPlayerId]
    : 0;
  const canPass = phase === GamePhase.CHOOSING && currentRoundScore > 0;

  const applyMappedSnapshot = useCallback((snapshot, mapped, phaseOverride = null) => {
    setActiveSnapshot(snapshot);
    setPlayers(mapped.players);
    setScores(mapped.scores);
    setRoundNumber(mapped.roundNumber);
    setCard(mapped.card);
    setRevealedIndexes(new Set(mapped.revealedIndexes));
    setWrongIndexes(new Set(mapped.wrongIndexes));
    setEliminatedPlayers(new Set(mapped.eliminatedPlayers));
    setPassedPlayers(new Set(mapped.passedPlayers));
    setCurrentPlayerIndex(mapped.currentPlayerIndex);
    setStarterIndex(mapped.starterIndex);
    setLastAction(mapped.lastAction);
    setEffectiveTargetScore(mapped.targetScore);
    setWinner(mapped.winner);
    setStats((prev) => mergeStats(mapped.players, prev));
    setSelectedIndexes(new Set());
    setSelectedRank(null);

    if (phaseOverride) {
      setPhase(phaseOverride);
      return;
    }

    setPhase(mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.CHOOSING);
  }, []);

  const startRound = useCallback(async (input = {}) => {
    if (requestInFlight) {
      return players;
    }

    const normalizedPlayers = normalizePlayers(input.players);
    const request = {
      players: normalizedPlayers,
      language: input.language,
      topic: input.topic,
      winCondition: Number.isInteger(input.winCondition) ? input.winCondition : targetScore
    };

    setRequestInFlight(true);
    setStartRequest(request);
    setLanguage(String(request.language || 'en'));
    setErrorMessage('');
    setPhase(GamePhase.LOADING_CARD);
    setCard(null);
    setWinner(null);
    setControlledPlayer(null);
    setActionTokensByPlayerId({});
    setLoadTicket((value) => value + 1);
    setQueuedSnapshot(null);
    setQueuedTransition('none');

    try {
      const response = await createServerGameSession(request);
      const snapshot = response?.snapshot && typeof response.snapshot === 'object'
        ? response.snapshot
        : response;
      const responseActionTokens = normalizeActionTokens(response?.actionTokens);
      const resolvedActionTokens = Object.keys(responseActionTokens).length > 0
        ? responseActionTokens
        : fallbackActionTokens(snapshot);
      setActionTokensByPlayerId(resolvedActionTokens);
      const mapped = mapSnapshot(snapshot, request.language, targetScore);
      setStats(initialStats(mapped.players));
      setControlledPlayer(normalizedPlayers[0] || mapped.players[0] || null);
      applyMappedSnapshot(snapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.CHOOSING);
      return mapped.players;
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.LOADING_CARD);
      setCard(null);
      setActionTokensByPlayerId({});
      return [];
    } finally {
      setRequestInFlight(false);
    }
  }, [applyMappedSnapshot, players, requestInFlight, targetScore]);

  const beginCardLoad = useCallback(async () => {
    if (requestInFlight) {
      return;
    }

    setErrorMessage('');
    setLoadTicket((value) => value + 1);

    if (!activeSnapshot?.gameId) {
      if (startRequest) {
        await startRound(startRequest);
      }
      return;
    }

    setRequestInFlight(true);
    setPhase(GamePhase.LOADING_CARD);

    try {
      const snapshot = await fetchServerGameSession(activeSnapshot.gameId);
      const mapped = mapSnapshot(snapshot, language, targetScore);
      setControlledPlayer((prev) => {
        if (prev && mapped.players.includes(prev)) {
          return prev;
        }
        return mapped.players[0] || null;
      });
      applyMappedSnapshot(snapshot, mapped);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.LOADING_CARD);
      setCard(null);
    } finally {
      setRequestInFlight(false);
    }
  }, [activeSnapshot, applyMappedSnapshot, language, requestInFlight, startRequest, startRound, targetScore]);

  const toggleOption = useCallback((index) => {
    if (phase !== GamePhase.CHOOSING && phase !== GamePhase.CONFIRMING) {
      return;
    }
    if (revealedIndexes.has(index) || wrongIndexes.has(index)) {
      return;
    }

    setSelectedIndexes((prev) => {
      if (prev.has(index) && prev.size === 1) {
        return new Set();
      }
      return new Set([index]);
    });
    setPhase(GamePhase.CHOOSING);
  }, [phase, revealedIndexes, wrongIndexes]);

  const chooseRank = useCallback((rank) => {
    setSelectedRank(rank);
  }, []);

  const requestConfirm = useCallback(() => {
    if (phase !== GamePhase.CHOOSING) {
      return;
    }
    if (selectedIndexes.size === 0) {
      return;
    }
    setPhase(GamePhase.CONFIRMING);
  }, [phase, selectedIndexes]);

  const cancelConfirm = useCallback(() => {
    if (phase !== GamePhase.CONFIRMING) {
      return;
    }
    setPhase(GamePhase.CHOOSING);
  }, [phase]);

  const queueOutcome = useCallback((responseSnapshot, actionType, actingPlayer, selectedIndex) => {
    const mappedResponse = mapSnapshot(responseSnapshot, language, targetScore);
    const prevRound = safeNumber(activeSnapshot?.roundState?.roundNumber, roundNumber || 1);
    const roundAdvanced = mappedResponse.roundNumber > prevRound;
    const gameOver = mappedResponse.backendPhase === GamePhase.GAME_OVER;
    const transition = gameOver ? 'game-over' : roundAdvanced ? 'round' : 'turn';

    setQueuedSnapshot(responseSnapshot);
    setQueuedTransition(transition);
    setErrorMessage('');
    setLastAction(mappedResponse.lastAction);
    setSelectedIndexes(new Set());
    setSelectedRank(null);

    setStats((prev) => {
      const seeded = mergeStats(players, prev);
      if (!actingPlayer || !seeded[actingPlayer]) {
        return seeded;
      }

      if (actionType === 'PASS') {
        return {
          ...seeded,
          [actingPlayer]: {
            ...seeded[actingPlayer],
            passes: seeded[actingPlayer].passes + 1
          }
        };
      }

      const pegState = mappedResponse.pegStateByIndex.get(selectedIndex);
      if (pegState === 'revealed') {
        return {
          ...seeded,
          [actingPlayer]: {
            ...seeded[actingPlayer],
            correct: seeded[actingPlayer].correct + 1
          }
        };
      }

      return {
        ...seeded,
        [actingPlayer]: {
          ...seeded[actingPlayer],
          wrong: seeded[actingPlayer].wrong + 1
        }
      };
    });

    if (actionType === 'PASS') {
      setPassedPlayers((prev) => new Set(prev).add(actingPlayer));
      setPhase(GamePhase.PASSED);
      return;
    }

    const pegState = mappedResponse.pegStateByIndex.get(selectedIndex);
    if (pegState === 'revealed') {
      setRevealedIndexes((prev) => new Set(prev).add(selectedIndex));
    } else {
      setWrongIndexes((prev) => new Set(prev).add(selectedIndex));
      setEliminatedPlayers((prev) => new Set(prev).add(actingPlayer));
    }
    setPhase(GamePhase.RESOLVED);
  }, [activeSnapshot, language, players, roundNumber, targetScore]);

  const confirmAnswer = useCallback(async () => {
    if (phase !== GamePhase.CONFIRMING) {
      return;
    }
    if (!activeSnapshot?.gameId || selectedIndexes.size === 0 || requestInFlight) {
      return;
    }

    const selectedIndex = [...selectedIndexes][0];
    const actingPlayer = currentPlayer;
    const actorPlayerId = String(activeSnapshot?.roundState?.currentPlayerId || '').trim();
    const actionToken = String(actionTokensByPlayerId?.[actorPlayerId] || '').trim();
    if (!actorPlayerId || !actionToken) {
      const message = 'Missing control token for active player. Restart game.';
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.CHOOSING);
      return;
    }
    const category = String(card?.category || '').toUpperCase();
    if (category === 'ORDER' && !Number.isInteger(selectedRank)) {
      setLastAction(`${actingPlayer}: choose rank first`);
      return;
    }
    const actionRequestId = createActionRequestId();

    setRequestInFlight(true);
    try {
      const responseSnapshot = await sendServerGameAction(activeSnapshot.gameId, {
        type: 'ANSWER',
        tileIndex: selectedIndex,
        rank: Number.isInteger(selectedRank) ? selectedRank : undefined,
        actorPlayerId,
        actionToken,
        actionRequestId
      });
      queueOutcome(responseSnapshot, 'ANSWER', actingPlayer, selectedIndex);
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.CHOOSING);
    } finally {
      setRequestInFlight(false);
    }
  }, [
    activeSnapshot,
    actionTokensByPlayerId,
    card?.category,
    currentPlayer,
    phase,
    queueOutcome,
    requestInFlight,
    selectedIndexes,
    selectedRank
  ]);

  const passTurn = useCallback(async () => {
    if (phase !== GamePhase.CHOOSING) {
      return;
    }
    if (!activeSnapshot?.gameId || requestInFlight) {
      return;
    }
    if (currentRoundScore < 1) {
      const message = `${currentPlayer} must answer correctly before passing`;
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.CHOOSING);
      return;
    }

    const actingPlayer = currentPlayer;
    const actorPlayerId = String(activeSnapshot?.roundState?.currentPlayerId || '').trim();
    const actionToken = String(actionTokensByPlayerId?.[actorPlayerId] || '').trim();
    if (!actorPlayerId || !actionToken) {
      const message = 'Missing control token for active player. Restart game.';
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.CHOOSING);
      return;
    }
    const actionRequestId = createActionRequestId();
    setRequestInFlight(true);
    try {
      const responseSnapshot = await sendServerGameAction(activeSnapshot.gameId, {
        type: 'PASS',
        actorPlayerId,
        actionToken,
        actionRequestId
      });
      queueOutcome(responseSnapshot, 'PASS', actingPlayer, -1);
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.CHOOSING);
    } finally {
      setRequestInFlight(false);
    }
  }, [activeSnapshot, actionTokensByPlayerId, currentPlayer, currentRoundScore, phase, queueOutcome, requestInFlight]);

  const nextStep = useCallback(() => {
    if (phase === GamePhase.ROUND_SUMMARY) {
      if (!queuedSnapshot) {
        setPhase(GamePhase.CHOOSING);
        return { done: false };
      }

      const mapped = mapSnapshot(queuedSnapshot, language, targetScore);
      applyMappedSnapshot(queuedSnapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.CHOOSING);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
      if (mapped.backendPhase === GamePhase.GAME_OVER) {
        return { done: true, winner: mapped.winner };
      }
      return { done: false };
    }

    if (phase !== GamePhase.RESOLVED && phase !== GamePhase.PASSED) {
      return { done: false };
    }

    if (!queuedSnapshot) {
      setPhase(GamePhase.CHOOSING);
      return { done: false };
    }

    if (queuedTransition === 'round') {
      const mapped = mapSnapshot(queuedSnapshot, language, targetScore);
      setScores(mapped.scores);
      setWinner(mapped.winner);
      setEffectiveTargetScore(mapped.targetScore);
      setPhase(GamePhase.ROUND_SUMMARY);
      setLastAction(`Round ${roundNumber} complete`);
      return { done: false };
    }

    const mapped = mapSnapshot(queuedSnapshot, language, targetScore);
    if (queuedTransition === 'game-over') {
      applyMappedSnapshot(queuedSnapshot, mapped, GamePhase.GAME_OVER);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
      return { done: true, winner: mapped.winner };
    }

    applyMappedSnapshot(queuedSnapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.CHOOSING);
    setQueuedSnapshot(null);
    setQueuedTransition('none');
    return { done: false };
  }, [applyMappedSnapshot, language, phase, queuedSnapshot, queuedTransition, roundNumber, targetScore]);

  const clearError = useCallback(() => {
    setErrorMessage('');
  }, []);

  const resetToSetup = useCallback(() => {
    setPhase(GamePhase.SETUP);
    setPlayers(DEFAULT_PLAYERS);
    setScores({ [DEFAULT_PLAYERS[0]]: 0 });
    setStats(initialStats(DEFAULT_PLAYERS));
    setRoundNumber(0);
    setCard(null);
    setSelectedIndexes(new Set());
    setSelectedRank(null);
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
    setPassedPlayers(new Set());
    setCurrentPlayerIndex(0);
    setStarterIndex(0);
    setLastAction(READY_LABEL);
    setWinner(null);
    setEffectiveTargetScore(targetScore);
    setLoadTicket(0);
    setErrorMessage('');
    setActiveSnapshot(null);
    setQueuedSnapshot(null);
    setQueuedTransition('none');
    setStartRequest(null);
    setRequestInFlight(false);
    setControlledPlayer(null);
    setActionTokensByPlayerId({});
  }, [targetScore]);

  const roundPoints = useMemo(() => initialScores(players), [players]);
  const isLocalTurn = !controlledPlayer || currentPlayer === controlledPlayer;

  return {
    phase,
    players,
    scores,
    roundPoints,
    stats,
    roundNumber,
    card,
    loadTicket,
    selectedIndexes,
    selectedRank,
    revealedIndexes,
    wrongIndexes,
    eliminatedPlayers,
    passedPlayers,
    currentPlayerIndex,
    starterIndex,
    currentPlayer,
    controlledPlayer,
    isLocalTurn,
    canPass,
    lastAction,
    winner,
    targetScore: effectiveTargetScore,
    errorMessage,
    clearError,
    startRound,
    beginCardLoad,
    cardLoaded: () => {},
    cardLoadFailed: () => {},
    toggleOption,
    chooseRank,
    requestConfirm,
    cancelConfirm,
    confirmAnswer,
    passTurn,
    nextStep,
    resetToSetup
  };
}
