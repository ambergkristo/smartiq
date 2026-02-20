import { act, renderHook } from '@testing-library/react';
import { useGameEngine } from './useGameEngine';
import { GamePhase } from './types';

function sampleCard(correctIndex = 0, category = 'OPEN') {
  return {
    id: `card-${correctIndex}`,
    cardId: `card-${correctIndex}`,
    topic: 'Math',
    category,
    difficulty: '2',
    language: 'en',
    question: 'Sample?',
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    correct: { correctIndex }
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

  test('reaching target score ends game after round score commit', () => {
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
    act(() => {
      result.current.passTurn();
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

  test('next round rotates starter and resets per-round markers', () => {
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
    expect(result.current.currentPlayer).toBe('Bob');
    expect(result.current.eliminatedPlayers.size).toBe(0);
    expect(result.current.passedPlayers.size).toBe(0);
  });

  test('ORDER category uses rank selection for correctness', () => {
    const { result } = renderHook(() => useGameEngine(30));
    act(() => {
      result.current.startRound('Alice');
    });
    act(() => {
      result.current.cardLoaded({
        ...sampleCard(0, 'ORDER'),
        correct: { rankByIndex: [1,2,3,4,5,6,7,8,9,10] }
      });
    });
    act(() => {
      result.current.toggleOption(2);
      result.current.chooseRank(3);
    });
    act(() => {
      result.current.requestConfirm();
    });
    act(() => {
      result.current.confirmAnswer();
    });

    expect(result.current.revealedIndexes.has(2)).toBe(true);
  });
});
