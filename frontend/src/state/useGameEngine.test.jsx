import { act, renderHook } from '@testing-library/react';
import { useGameEngine } from './useGameEngine';
import { GamePhase } from './types';

function sampleCard(correctIndex = 0) {
  return {
    id: `card-${correctIndex}`,
    topic: 'Math',
    difficulty: '2',
    language: 'en',
    question: 'Sample?',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    correctIndex
  };
}

describe('useGameEngine Smart10 round semantics', () => {
  test('starts in SETUP and enters LOADING_CARD on game start', () => {
    const { result } = renderHook(() => useGameEngine(30));
    expect(result.current.phase).toBe(GamePhase.SETUP);

    act(() => {
      result.current.startRound('Alice,Bob');
    });
    expect(result.current.phase).toBe(GamePhase.LOADING_CARD);
    expect(result.current.roundNumber).toBe(1);
  });

  test('wrong answer eliminates player for current round', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice,Bob');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.toggleOption(1);
    });
    act(() => {
      result.current.requestConfirm();
    });
    act(() => {
      result.current.confirmAnswer();
    });

    expect(result.current.phase).toBe(GamePhase.RESOLVED);
    expect(result.current.eliminatedPlayers.has('Alice')).toBe(true);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.phase).toBe(GamePhase.CHOOSING);
    expect(result.current.currentPlayer).toBe('Bob');
  });

  test('pass marks player as passed and advances turn', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice,Bob');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.passTurn();
    });

    expect(result.current.phase).toBe(GamePhase.PASSED);
    expect(result.current.passedPlayers.has('Alice')).toBe(true);

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.phase).toBe(GamePhase.CHOOSING);
    expect(result.current.currentPlayer).toBe('Bob');
  });

  test('round ends when all players passed or eliminated', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice,Bob');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.passTurn();
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.passTurn();
    });
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.phase).toBe(GamePhase.ROUND_SUMMARY);
  });

  test('reaching target score ends game', () => {
    const { result } = renderHook(() => useGameEngine(1));
    act(() => {
      result.current.startRound('Alice');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.toggleOption(0);
    });
    act(() => {
      result.current.requestConfirm();
    });
    act(() => {
      result.current.confirmAnswer();
    });
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.phase).toBe(GamePhase.GAME_OVER);
    expect(result.current.winner).toBe('Alice');
  });

  test('confirmAnswer is ignored unless phase is CONFIRMING', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.toggleOption(0);
    });
    act(() => {
      result.current.confirmAnswer();
    });

    expect(result.current.phase).toBe(GamePhase.CHOOSING);
    expect(result.current.scores.Alice).toBe(0);
    expect(result.current.revealedIndexes.size).toBe(0);
    expect(result.current.wrongIndexes.size).toBe(0);
  });

  test('next round resets per-round pass and elimination markers', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice,Bob');
    });
    act(() => {
      result.current.cardLoaded(sampleCard(0));
    });
    act(() => {
      result.current.passTurn();
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.passTurn();
    });
    act(() => {
      result.current.nextStep();
    });

    expect(result.current.phase).toBe(GamePhase.ROUND_SUMMARY);

    act(() => {
      result.current.nextStep();
    });
    expect(result.current.phase).toBe(GamePhase.LOADING_CARD);
    expect(result.current.roundNumber).toBe(2);

    act(() => {
      result.current.cardLoaded(sampleCard(1));
    });
    expect(result.current.phase).toBe(GamePhase.CHOOSING);
    expect(result.current.currentPlayer).toBe('Alice');
    expect(result.current.eliminatedPlayers.size).toBe(0);
    expect(result.current.passedPlayers.size).toBe(0);
  });
});
