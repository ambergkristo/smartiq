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

describe('useGameEngine transitions', () => {
  test('starts in SETUP', () => {
    const { result } = renderHook(() => useGameEngine(3));
    expect(result.current.phase).toBe(GamePhase.SETUP);
  });

  test('startRound moves to LOADING_CARD', () => {
    const { result } = renderHook(() => useGameEngine(3));
    act(() => {
      result.current.startRound('Alice,Bob');
    });
    expect(result.current.phase).toBe(GamePhase.LOADING_CARD);
  });

  test('loaded card enables choosing and confirming flow', () => {
    const { result } = renderHook(() => useGameEngine(3));
    act(() => {
      result.current.startRound('Alice');
      result.current.cardLoaded(sampleCard(0));
    });
    expect(result.current.phase).toBe(GamePhase.CHOOSING);

    act(() => {
      result.current.requestConfirm();
    });
    expect(result.current.phase).toBe(GamePhase.CONFIRMING);

    act(() => {
      result.current.cancelConfirm();
    });
    expect(result.current.phase).toBe(GamePhase.CHOOSING);
  });

  test('confirmAnswer updates score and resolves', () => {
    const { result } = renderHook(() => useGameEngine(3));
    act(() => {
      result.current.startRound('Alice');
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
    expect(result.current.phase).toBe(GamePhase.RESOLVED);
    expect(result.current.scores.Alice).toBe(1);
  });

  test('pass and round completion transitions', () => {
    const { result } = renderHook(() => useGameEngine(1));
    act(() => {
      result.current.startRound('Alice');
      result.current.cardLoaded(sampleCard(0));
      result.current.passTurn();
    });
    expect(result.current.phase).toBe(GamePhase.PASSED);

    act(() => {
      result.current.nextStep();
    });
    expect(result.current.phase).toBe(GamePhase.ROUND_SUMMARY);
  });
});
