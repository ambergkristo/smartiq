import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PLAYERS, GamePhase } from './types';
import { scoreDelta } from './scoring';

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

export function useGameEngine(roundLength) {
  const [phase, setPhase] = useState(GamePhase.SETUP);
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [scores, setScores] = useState({ 'Player 1': 0 });
  const [cardIndex, setCardIndex] = useState(0);
  const [card, setCard] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());
  const [lastAction, setLastAction] = useState('Ready');
  const [loadTicket, setLoadTicket] = useState(0);

  const currentPlayerIndex = useMemo(() => {
    if (players.length === 0) return 0;
    return cardIndex % players.length;
  }, [cardIndex, players]);

  const currentPlayer = players[currentPlayerIndex] ?? 'Player 1';

  const startRound = useCallback((playersText) => {
    const normalizedPlayers = normalizePlayers(playersText);
    setPlayers(normalizedPlayers);
    setScores(initialScores(normalizedPlayers));
    setCardIndex(0);
    setCard(null);
    setSelectedIndexes(new Set());
    setPhase(GamePhase.LOADING_CARD);
    setLoadTicket((value) => value + 1);
    setLastAction('Round started');
    return normalizedPlayers;
  }, []);

  const beginCardLoad = useCallback(() => {
    setPhase(GamePhase.LOADING_CARD);
    setCard(null);
    setSelectedIndexes(new Set());
    setLoadTicket((value) => value + 1);
    setLastAction('Loading card');
  }, []);

  const cardLoaded = useCallback((nextCard) => {
    setCard(nextCard);
    setSelectedIndexes(new Set());
    setPhase(GamePhase.CHOOSING);
    setLastAction('Card loaded');
  }, []);

  const cardLoadFailed = useCallback(() => {
    setPhase(GamePhase.LOADING_CARD);
    setCard(null);
    setLastAction('Load failed');
  }, []);

  const toggleOption = useCallback((index) => {
    if (phase !== GamePhase.CHOOSING && phase !== GamePhase.CONFIRMING) return;
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setPhase(GamePhase.CHOOSING);
  }, [phase]);

  const requestConfirm = useCallback(() => {
    if (phase !== GamePhase.CHOOSING) return;
    setPhase(GamePhase.CONFIRMING);
  }, [phase]);

  const cancelConfirm = useCallback(() => {
    if (phase !== GamePhase.CONFIRMING) return;
    setPhase(GamePhase.CHOOSING);
  }, [phase]);

  const confirmAnswer = useCallback(() => {
    if (!card) return;
    const delta = scoreDelta(card, selectedIndexes, false);
    setScores((prev) => ({
      ...prev,
      [currentPlayer]: (prev[currentPlayer] ?? 0) + delta
    }));
    setPhase(GamePhase.RESOLVED);
    setLastAction(`${currentPlayer} answered (${delta > 0 ? '+1' : '0'})`);
  }, [card, currentPlayer, selectedIndexes]);

  const passTurn = useCallback(() => {
    setPhase(GamePhase.PASSED);
    setLastAction(`${currentPlayer} passed`);
  }, [currentPlayer]);

  const nextStep = useCallback(() => {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= roundLength) {
      setPhase(GamePhase.ROUND_SUMMARY);
      setLastAction('Round complete');
      return { done: true };
    }
    setCardIndex(nextIndex);
    setCard(null);
    setSelectedIndexes(new Set());
    setPhase(GamePhase.LOADING_CARD);
    setLoadTicket((value) => value + 1);
    return { done: false };
  }, [cardIndex, roundLength]);

  const resetToSetup = useCallback(() => {
    setPhase(GamePhase.SETUP);
    setCard(null);
    setSelectedIndexes(new Set());
    setLoadTicket(0);
    setLastAction('Ready');
  }, []);

  return {
    phase,
    players,
    scores,
    cardIndex,
    card,
    loadTicket,
    selectedIndexes,
    currentPlayerIndex,
    currentPlayer,
    lastAction,
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
