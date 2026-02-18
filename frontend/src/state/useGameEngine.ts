import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PLAYERS, GamePhase } from './types';
import { expectedCorrectIndexes } from './scoring';

const TARGET_SCORE_DEFAULT = 30;

function normalizePlayers(raw) {
  const players = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return players.length > 0 ? players : DEFAULT_PLAYERS;
}

function initialScores(players) {
  return players.reduce((acc, player) => {
    acc[player] = 0;
    return acc;
  }, {});
}

function nextActiveIndex(players, startIndex, eliminatedPlayers, passedPlayers) {
  if (players.length === 0) return 0;

  for (let step = 1; step <= players.length; step += 1) {
    const idx = (startIndex + step) % players.length;
    const player = players[idx];
    if (!eliminatedPlayers.has(player) && !passedPlayers.has(player)) {
      return idx;
    }
  }

  return -1;
}

function isPlayerActive(player, eliminatedPlayers, passedPlayers) {
  return !eliminatedPlayers.has(player) && !passedPlayers.has(player);
}

export function useGameEngine(targetScore = TARGET_SCORE_DEFAULT) {
  const [phase, setPhase] = useState(GamePhase.SETUP);
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [scores, setScores] = useState({ 'Player 1': 0 });
  const [roundNumber, setRoundNumber] = useState(0);
  const [card, setCard] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());
  const [revealedIndexes, setRevealedIndexes] = useState(new Set());
  const [wrongIndexes, setWrongIndexes] = useState(new Set());
  const [eliminatedPlayers, setEliminatedPlayers] = useState(new Set());
  const [passedPlayers, setPassedPlayers] = useState(new Set());
  const [lastAction, setLastAction] = useState('Ready');
  const [loadTicket, setLoadTicket] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [winner, setWinner] = useState(null);

  const currentPlayer = players[currentPlayerIndex] ?? 'Player 1';

  const allSlotsResolved = useMemo(() => {
    if (!card?.options?.length) return false;
    return revealedIndexes.size + wrongIndexes.size >= card.options.length;
  }, [card, revealedIndexes, wrongIndexes]);

  const noPlayersAvailable = useMemo(() => {
    if (players.length === 0) return true;
    return players.every((player) => eliminatedPlayers.has(player) || passedPlayers.has(player));
  }, [eliminatedPlayers, passedPlayers, players]);

  const startRound = useCallback((playersText) => {
    const normalizedPlayers = normalizePlayers(playersText);
    setPlayers(normalizedPlayers);
    setScores(initialScores(normalizedPlayers));
    setRoundNumber(1);
    setCard(null);
    setSelectedIndexes(new Set());
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
    setPassedPlayers(new Set());
    setCurrentPlayerIndex(0);
    setWinner(null);
    setPhase(GamePhase.LOADING_CARD);
    setLoadTicket((value) => value + 1);
    setLastAction('Game started');
    return normalizedPlayers;
  }, []);

  const beginCardLoad = useCallback(() => {
    setPhase(GamePhase.LOADING_CARD);
    setCard(null);
    setSelectedIndexes(new Set());
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
    setPassedPlayers(new Set());
    setCurrentPlayerIndex(0);
    setLoadTicket((value) => value + 1);
    setLastAction('Loading round card');
  }, []);

  const cardLoaded = useCallback((nextCard) => {
    setCard(nextCard);
    setSelectedIndexes(new Set());
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
    setPassedPlayers(new Set());
    setCurrentPlayerIndex(0);
    setPhase(GamePhase.CHOOSING);
    setLastAction(`Round ${roundNumber} card loaded`);
  }, [roundNumber]);

  const cardLoadFailed = useCallback(() => {
    setPhase(GamePhase.LOADING_CARD);
    setCard(null);
    setLastAction('Load failed');
  }, []);

  const toggleOption = useCallback((index) => {
    if (phase !== GamePhase.CHOOSING && phase !== GamePhase.CONFIRMING) return;
    if (revealedIndexes.has(index) || wrongIndexes.has(index)) return;
    if (!isPlayerActive(currentPlayer, eliminatedPlayers, passedPlayers)) return;

    setSelectedIndexes((prev) => {
      if (prev.has(index) && prev.size === 1) {
        return new Set();
      }
      return new Set([index]);
    });
    setPhase(GamePhase.CHOOSING);
  }, [currentPlayer, eliminatedPlayers, passedPlayers, phase, revealedIndexes, wrongIndexes]);

  const requestConfirm = useCallback(() => {
    if (phase !== GamePhase.CHOOSING || selectedIndexes.size === 0) return;
    if (!isPlayerActive(currentPlayer, eliminatedPlayers, passedPlayers)) return;
    setPhase(GamePhase.CONFIRMING);
  }, [currentPlayer, eliminatedPlayers, passedPlayers, phase, selectedIndexes]);

  const cancelConfirm = useCallback(() => {
    if (phase !== GamePhase.CONFIRMING) return;
    setPhase(GamePhase.CHOOSING);
  }, [phase]);

  const confirmAnswer = useCallback(() => {
    if (phase !== GamePhase.CONFIRMING) return;
    if (!card || selectedIndexes.size === 0) return;
    if (!isPlayerActive(currentPlayer, eliminatedPlayers, passedPlayers)) return;
    const selectedIndex = [...selectedIndexes][0];
    const correctIndexes = expectedCorrectIndexes(card);
    const isCorrect = correctIndexes.has(selectedIndex);

    if (isCorrect) {
      const nextScore = (scores[currentPlayer] ?? 0) + 1;
      const reachedTarget = nextScore >= targetScore;
      setScores((prev) => ({
        ...prev,
        [currentPlayer]: nextScore
      }));
      setRevealedIndexes((prev) => new Set(prev).add(selectedIndex));
      if (reachedTarget) {
        setWinner(currentPlayer);
        setPhase(GamePhase.GAME_OVER);
        setLastAction(`${currentPlayer} reached ${targetScore} points`);
        return;
      }
      setLastAction(`${currentPlayer} answered correctly (+1)`);
    } else {
      setWrongIndexes((prev) => new Set(prev).add(selectedIndex));
      setEliminatedPlayers((prev) => new Set(prev).add(currentPlayer));
      setLastAction(`${currentPlayer} answered wrong (eliminated)`);
    }

    setPhase(GamePhase.RESOLVED);
    setSelectedIndexes(new Set());
  }, [card, currentPlayer, eliminatedPlayers, passedPlayers, phase, scores, selectedIndexes, targetScore]);

  const passTurn = useCallback(() => {
    if (phase !== GamePhase.CHOOSING) return;
    if (!isPlayerActive(currentPlayer, eliminatedPlayers, passedPlayers)) return;
    setPassedPlayers((prev) => new Set(prev).add(currentPlayer));
    setSelectedIndexes(new Set());
    setPhase(GamePhase.PASSED);
    setLastAction(`${currentPlayer} passed`);
  }, [currentPlayer, eliminatedPlayers, passedPlayers, phase]);

  const nextStep = useCallback(() => {
    if (phase === GamePhase.ROUND_SUMMARY) {
      setRoundNumber((prev) => prev + 1);
      beginCardLoad();
      return { done: false };
    }

    if (phase !== GamePhase.RESOLVED && phase !== GamePhase.PASSED) {
      return { done: false };
    }

    const resolved = allSlotsResolved;
    const blocked = noPlayersAvailable;

    if (resolved || blocked) {
      const top = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0))[0] ?? null;
      const topScore = top ? scores[top] ?? 0 : 0;

      if (topScore >= targetScore) {
        setWinner(top);
        setPhase(GamePhase.GAME_OVER);
        setLastAction(`${top} reached ${targetScore} points`);
        return { done: true, winner: top };
      }

      setPhase(GamePhase.ROUND_SUMMARY);
      setLastAction(`Round ${roundNumber} complete`);
      return { done: false };
    }

    const nextIdx = nextActiveIndex(players, currentPlayerIndex, eliminatedPlayers, passedPlayers);
    if (nextIdx < 0) {
      setPhase(GamePhase.ROUND_SUMMARY);
      setLastAction(`Round ${roundNumber} complete`);
      return { done: false };
    }

    setCurrentPlayerIndex(nextIdx);
    setSelectedIndexes(new Set());
    setPhase(GamePhase.CHOOSING);
    return { done: false };
  }, [
    allSlotsResolved,
    beginCardLoad,
    currentPlayerIndex,
    eliminatedPlayers,
    noPlayersAvailable,
    passedPlayers,
    phase,
    players,
    roundNumber,
    scores,
    targetScore
  ]);

  const resetToSetup = useCallback(() => {
    setPhase(GamePhase.SETUP);
    setCard(null);
    setSelectedIndexes(new Set());
    setRevealedIndexes(new Set());
    setWrongIndexes(new Set());
    setEliminatedPlayers(new Set());
    setPassedPlayers(new Set());
    setLoadTicket(0);
    setRoundNumber(0);
    setCurrentPlayerIndex(0);
    setWinner(null);
    setLastAction('Ready');
  }, []);

  return {
    phase,
    players,
    scores,
    roundNumber,
    card,
    loadTicket,
    selectedIndexes,
    revealedIndexes,
    wrongIndexes,
    eliminatedPlayers,
    passedPlayers,
    currentPlayerIndex,
    currentPlayer,
    lastAction,
    winner,
    targetScore,
    startRound,
    beginCardLoad,
    cardLoaded,
    cardLoadFailed,
    toggleOption,
    requestConfirm,
    cancelConfirm,
    confirmAnswer,
    passTurn,
    nextStep,
    resetToSetup
  };
}
