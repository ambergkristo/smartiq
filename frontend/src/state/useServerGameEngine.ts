import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createServerGameSession,
  fetchServerGameSession,
  resolveGameSessionErrorMessage,
  sendServerGameAction
} from '../api';
import { calculateSoloRoundXp, getCherryRoundReward } from './cherryRounds';
import { DEFAULT_PLAYERS, GamePhase } from './types';

const TARGET_SCORE_DEFAULT = 30;
const READY_LABEL = 'Ready';
const SUPPORTED_GAME_SNAPSHOT_API_VERSION = '1';
const BOARD_ANSWER_COUNT = 8;
const GAME_MODE_STANDARD = 'standard';
const GAME_MODE_SOLO = 'solo';

function initialScores(players) {
  return players.reduce((acc, player) => {
    acc[player] = 0;
    return acc;
  }, {});
}

function initialStats(players) {
  return players.reduce((acc, player) => {
    acc[player] = { correct: 0, wrong: 0 };
    return acc;
  }, {});
}

function mergeStats(players, stats) {
  const merged = { ...stats };
  players.forEach((player) => {
    if (!merged[player]) {
      merged[player] = { correct: 0, wrong: 0 };
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

function normalizeBackendPhase(rawPhase) {
  const normalized = String(rawPhase || GamePhase.QUESTION_ACTIVE).toUpperCase();
  if (normalized === 'CHOOSING') {
    return GamePhase.QUESTION_ACTIVE;
  }
  return normalized;
}

function resolveCardCorrectIndexes(card) {
  const rawCorrect = card?.correct;
  if (rawCorrect && typeof rawCorrect === 'object' && Array.isArray(rawCorrect.correctIndexes)) {
    return rawCorrect.correctIndexes.filter((index) => Number.isInteger(index));
  }
  if (rawCorrect && typeof rawCorrect === 'object' && Number.isInteger(rawCorrect.correctIndex)) {
    return [rawCorrect.correctIndex];
  }
  return [];
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
  players.forEach((player) => {
    const id = String(player?.playerId || '');
    const displayName = playerById.get(id) || id;
    const status = String(statuses[id] || 'ACTIVE').toUpperCase();
    if (status === 'OUT') {
      eliminatedPlayers.push(displayName);
    }
  });

  const rawPegs = Array.isArray(snapshot?.boardState?.pegs) ? snapshot.boardState.pegs : [];
  const pegs = [...rawPegs]
    .filter((peg) => Number.isInteger(peg?.index))
    .sort((a, b) => a.index - b.index);
  const revealedIndexes = [];
  const wrongIndexes = [];
  const pegStateByIndex = new Map();
  const answers = pegs.slice(0, BOARD_ANSWER_COUNT).map((peg, idx) => {
    const pegIndex = safeNumber(peg?.index, idx);
    const state = String(peg?.state || 'hidden').toLowerCase();
    pegStateByIndex.set(pegIndex, state);
    if (state === 'revealed' && pegIndex < BOARD_ANSWER_COUNT) {
      revealedIndexes.push(pegIndex);
    } else if (state === 'wrong' && pegIndex < BOARD_ANSWER_COUNT) {
      wrongIndexes.push(pegIndex);
    }
    return typeof peg?.value === 'string' ? peg.value.trim() : '';
  });

  const fallbackAnswers = Array.from(
    { length: BOARD_ANSWER_COUNT },
    (_, index) => answers[index] ?? ''
  );
  const difficulty = snapshot?.boardState?.difficulty ?? '1';
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
  const backendPhase = normalizeBackendPhase(snapshot?.roundState?.phase);

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
      questionText: String(snapshot?.boardState?.question || ''),
      options: fallbackAnswers,
      answers: fallbackAnswers,
      difficulty,
      correct: Array.isArray(snapshot?.boardState?.correctAnswerIndexes)
        ? { correctIndexes: snapshot.boardState.correctAnswerIndexes.filter((index) => Number.isInteger(index)) }
        : {}
    },
    revealedIndexes,
    wrongIndexes,
    eliminatedPlayers,
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
  const [revealedIndexes, setRevealedIndexes] = useState(new Set());
  const [wrongIndexes, setWrongIndexes] = useState(new Set());
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
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
  const [resolutionState, setResolutionState] = useState(null);
  const [startRequest, setStartRequest] = useState(null);
  const [language, setLanguage] = useState('en');
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [controlledPlayer, setControlledPlayer] = useState(null);
  const [actionTokensByPlayerId, setActionTokensByPlayerId] = useState({});
  const [gameMode, setGameMode] = useState(GAME_MODE_STANDARD);
  const [sessionXp, setSessionXp] = useState(0);
  const [lastRoundXp, setLastRoundXp] = useState(0);
  const sessionXpRef = useRef(0);

  const currentPlayer = players[currentPlayerIndex] ?? players[0] ?? DEFAULT_PLAYERS[0];

  const applyMappedSnapshot = useCallback((snapshot, mapped, phaseOverride = null) => {
    setActiveSnapshot(snapshot);
    setPlayers(mapped.players);
    setScores(mapped.scores);
    setRoundNumber(mapped.roundNumber);
    setCard(mapped.card);
    setRevealedIndexes(new Set(mapped.revealedIndexes));
    setWrongIndexes(new Set(mapped.wrongIndexes));
    setEliminatedPlayers(new Set(mapped.eliminatedPlayers));
    setCurrentPlayerIndex(mapped.currentPlayerIndex);
    setStarterIndex(mapped.starterIndex);
    setLastAction(mapped.lastAction);
    setEffectiveTargetScore(mapped.targetScore);
    setWinner(mapped.winner);
    setStats((prev) => mergeStats(mapped.players, prev));
    setSelectedIndexes(new Set());
    setResolutionState(null);
    setPhase(phaseOverride || (mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.QUESTION_ACTIVE));
  }, []);

  const adoptCreatedSession = useCallback((response, request = {}) => {
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
    setControlledPlayer(null);
    setStartRequest({
      players: mapped.players,
      language: request.language || mapped.card.language,
      topic: mapped.card.topic || undefined,
      winCondition: mapped.targetScore,
      mode: request.mode === GAME_MODE_SOLO ? GAME_MODE_SOLO : GAME_MODE_STANDARD
    });
    applyMappedSnapshot(snapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.QUESTION_ACTIVE);
    return mapped.players;
  }, [applyMappedSnapshot, targetScore]);

  const startRound = useCallback(async (input = {}) => {
    if (requestInFlight) {
      return players;
    }

    const normalizedPlayers = normalizePlayers(input.players);
    const request = {
      players: normalizedPlayers,
      language: input.language,
      topic: input.topic,
      winCondition: Number.isInteger(input.winCondition) ? input.winCondition : targetScore,
      mode: input.mode === GAME_MODE_SOLO ? GAME_MODE_SOLO : GAME_MODE_STANDARD
    };

    setRequestInFlight(true);
    setStartRequest(request);
    setGameMode(request.mode);
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
    setResolutionState(null);
    sessionXpRef.current = 0;
    setSessionXp(0);
    setLastRoundXp(0);

    try {
      const response = await createServerGameSession(request);
      return adoptCreatedSession(response, request);
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.LOADING_CARD);
      setCard(null);
      setActionTokensByPlayerId({});
      setResolutionState(null);
      return [];
    } finally {
      setRequestInFlight(false);
    }
  }, [adoptCreatedSession, players, requestInFlight, targetScore]);

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
      setControlledPlayer(null);
      applyMappedSnapshot(snapshot, mapped);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.LOADING_CARD);
      setCard(null);
      setResolutionState(null);
    } finally {
      setRequestInFlight(false);
    }
  }, [activeSnapshot, applyMappedSnapshot, language, requestInFlight, startRequest, startRound, targetScore]);

  const toggleOption = useCallback((index) => {
    if (phase !== GamePhase.QUESTION_ACTIVE && phase !== GamePhase.ANSWER_SELECTED) {
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
    setPhase(GamePhase.QUESTION_ACTIVE);
  }, [phase, revealedIndexes, wrongIndexes]);

  const requestConfirm = useCallback(() => {
    if (phase !== GamePhase.QUESTION_ACTIVE) {
      return;
    }
    if (selectedIndexes.size === 0) {
      return;
    }
    setPhase(GamePhase.ANSWER_SELECTED);
  }, [phase, selectedIndexes]);

  const cancelConfirm = useCallback(() => {
    if (phase !== GamePhase.ANSWER_SELECTED) {
      return;
    }
    setPhase(GamePhase.QUESTION_ACTIVE);
  }, [phase]);

  const queueOutcome = useCallback((responseSnapshot, actingPlayer, selectedIndex, selectedOption) => {
    const mappedResponse = mapSnapshot(responseSnapshot, language, targetScore);
    const backendPhase = mappedResponse.backendPhase;
    const roundReward = getCherryRoundReward(mappedResponse.roundNumber);
    const transition = backendPhase === GamePhase.GAME_OVER
      ? 'game-over'
      : backendPhase === GamePhase.QUESTION_ACTIVE
        ? 'reveal'
        : 'round';
    const revealedOptions = mappedResponse.revealedIndexes.map((index) => (
      mappedResponse.card.options[index] ?? card?.options?.[index] ?? `Answer ${index + 1}`
    ));
    const pegState = mappedResponse.pegStateByIndex.get(selectedIndex);
    const outcome = backendPhase === GamePhase.ROUND_SUCCESS
      ? 'success'
      : backendPhase === GamePhase.ROUND_FAIL
        ? 'fail'
        : pegState === 'revealed'
          ? 'correct'
          : 'fail';
    const correctIndexes = resolveCardCorrectIndexes(mappedResponse.card);
    const correctOptions = correctIndexes.map((index) => (
      mappedResponse.card.options[index] ?? card?.options?.[index] ?? `Answer ${index + 1}`
    ));
    const selectedOptions = outcome === 'success'
      ? correctOptions
      : Array.from(new Set([...(revealedOptions || []), selectedOption].filter(Boolean)));
    const roundXp = gameMode === GAME_MODE_SOLO
      ? calculateSoloRoundXp(mappedResponse.roundNumber, correctIndexes.length, backendPhase === GamePhase.ROUND_SUCCESS)
      : 0;
    const nextSessionXp = gameMode === GAME_MODE_SOLO
      ? sessionXpRef.current + roundXp
      : sessionXpRef.current;
    if (gameMode === GAME_MODE_SOLO) {
      sessionXpRef.current = nextSessionXp;
      setSessionXp(nextSessionXp);
      setLastRoundXp(roundXp);
    } else {
      setLastRoundXp(0);
    }

    setQueuedSnapshot(responseSnapshot);
    setQueuedTransition(transition);
    setErrorMessage('');
    setLastAction(mappedResponse.lastAction);
    setSelectedIndexes(new Set());
    setResolutionState({
      outcome,
      actingPlayer,
      selectedIndex,
      selectedOption,
      selectedOptions,
      revealedOptions,
      correctOptions,
      roundType: roundReward.type,
      roundLabel: roundReward.label,
      xpMultiplier: roundReward.multiplier,
      xpMultiplierLabel: roundReward.multiplierLabel,
      xpGained: roundXp,
      totalXp: nextSessionXp,
      lastAction: mappedResponse.lastAction
    });

    setStats((prev) => {
      const seeded = mergeStats(players, prev);
      if (!actingPlayer || !seeded[actingPlayer]) {
        return seeded;
      }

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

    if (pegState === 'revealed') {
      setRevealedIndexes((prev) => new Set(prev).add(selectedIndex));
    } else {
      setWrongIndexes((prev) => new Set(prev).add(selectedIndex));
      setEliminatedPlayers((prev) => new Set(prev).add(actingPlayer));
    }

    if (backendPhase === GamePhase.ROUND_SUCCESS) {
      setPhase(GamePhase.ROUND_SUCCESS);
      return;
    }
    if (backendPhase === GamePhase.ROUND_FAIL) {
      setPhase(GamePhase.ROUND_FAIL);
      return;
    }
    setPhase(GamePhase.ROUND_REVEAL);
  }, [card?.options, gameMode, language, players, targetScore]);

  const confirmAnswer = useCallback(async () => {
    if (phase !== GamePhase.ANSWER_SELECTED) {
      return;
    }
    if (!activeSnapshot?.gameId || selectedIndexes.size === 0 || requestInFlight) {
      return;
    }

    const selectedIndex = [...selectedIndexes][0];
    const selectedOption = card?.options?.[selectedIndex] ?? `Answer ${selectedIndex + 1}`;
    const actingPlayer = currentPlayer;
    const actorPlayerId = String(activeSnapshot?.roundState?.currentPlayerId || '').trim();
    const actionToken = String(actionTokensByPlayerId?.[actorPlayerId] || '').trim();
    if (!actorPlayerId || !actionToken) {
      const message = 'Missing control token for active player. Restart game.';
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.QUESTION_ACTIVE);
      return;
    }
    const actionRequestId = createActionRequestId();

    setRequestInFlight(true);
    try {
      const responseSnapshot = await sendServerGameAction(activeSnapshot.gameId, {
        type: 'ANSWER',
        tileIndex: selectedIndex,
        actorPlayerId,
        actionToken,
        actionRequestId
      });
      queueOutcome(responseSnapshot, actingPlayer, selectedIndex, selectedOption);
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      setPhase(GamePhase.QUESTION_ACTIVE);
    } finally {
      setRequestInFlight(false);
    }
  }, [
    activeSnapshot,
    actionTokensByPlayerId,
    card?.options,
    currentPlayer,
    phase,
    queueOutcome,
    requestInFlight,
    selectedIndexes
  ]);

  const nextStep = useCallback(async () => {
    if (phase !== GamePhase.ROUND_REVEAL && phase !== GamePhase.ROUND_SUCCESS && phase !== GamePhase.ROUND_FAIL) {
      return { done: false };
    }

    if (!queuedSnapshot) {
      setPhase(GamePhase.QUESTION_ACTIVE);
      return { done: false };
    }

    if (phase === GamePhase.ROUND_REVEAL) {
      const mapped = mapSnapshot(queuedSnapshot, language, targetScore);
      applyMappedSnapshot(queuedSnapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.QUESTION_ACTIVE);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
      return { done: false };
    }

    if (!activeSnapshot?.gameId || requestInFlight) {
      return { done: false };
    }

    const actorPlayerId = String(activeSnapshot?.roundState?.currentPlayerId || '').trim();
    const actionToken = String(actionTokensByPlayerId?.[actorPlayerId] || '').trim();
    if (!actorPlayerId || !actionToken) {
      const message = 'Missing control token for active player. Restart game.';
      setErrorMessage(message);
      setLastAction(message);
      return { done: false };
    }

    setRequestInFlight(true);
    try {
      const responseSnapshot = await sendServerGameAction(activeSnapshot.gameId, {
        type: 'ADVANCE',
        actorPlayerId,
        actionToken,
        actionRequestId: createActionRequestId()
      });
      const mapped = mapSnapshot(responseSnapshot, language, targetScore);
      applyMappedSnapshot(responseSnapshot, mapped, mapped.backendPhase === GamePhase.GAME_OVER ? GamePhase.GAME_OVER : GamePhase.QUESTION_ACTIVE);
      setQueuedSnapshot(null);
      setQueuedTransition('none');
      return mapped.backendPhase === GamePhase.GAME_OVER
        ? { done: true, winner: mapped.winner }
        : { done: false };
    } catch (error) {
      const message = resolveGameSessionErrorMessage(error);
      setErrorMessage(message);
      setLastAction(message);
      return { done: false };
    } finally {
      setRequestInFlight(false);
    }
  }, [actionTokensByPlayerId, activeSnapshot, applyMappedSnapshot, language, phase, queuedSnapshot, requestInFlight, targetScore]);

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
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
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
    setResolutionState(null);
    setStartRequest(null);
    setRequestInFlight(false);
    setControlledPlayer(null);
    setActionTokensByPlayerId({});
    setGameMode(GAME_MODE_STANDARD);
    sessionXpRef.current = 0;
    setSessionXp(0);
    setLastRoundXp(0);
  }, [targetScore]);

  const roundPoints = useMemo(() => initialScores(players), [players]);
  const isLocalTurn = true;

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
    revealedIndexes,
    wrongIndexes,
    eliminatedPlayers,
    currentPlayerIndex,
    starterIndex,
    currentPlayer,
    controlledPlayer,
    isLocalTurn,
    gameMode,
    sessionXp,
    lastRoundXp,
    lastAction,
    winner,
    resolutionState,
    nextTransition: queuedTransition,
    targetScore: effectiveTargetScore,
    errorMessage,
    clearError,
    startRound,
    adoptCreatedSession,
    beginCardLoad,
    cardLoaded: () => {},
    cardLoadFailed: () => {},
    toggleOption,
    requestConfirm,
    cancelConfirm,
    confirmAnswer,
    nextStep,
    resetToSetup
  };
}
