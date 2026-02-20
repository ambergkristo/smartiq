import { render, screen, within } from '@testing-library/react';
import GameBoard from './GameBoard';

function makeProps() {
  return {
    card: {
      id: 'c1',
      cardId: 'c1',
      category: 'OPEN',
      topic: 'Math',
      difficulty: '2',
      language: 'en',
      question: 'Question?',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    },
    selectedIndexes: new Set(),
    selectedRank: null,
    revealedIndexes: new Set(),
    wrongIndexes: new Set(),
    toggleIndex: vi.fn(),
    onRankSelect: vi.fn(),
    phase: 'CHOOSING',
    onAnswer: vi.fn(),
    onConfirm: vi.fn(),
    onCancelConfirm: vi.fn(),
    onPass: vi.fn(),
    onNext: vi.fn(),
    players: ['Player 1', 'Player 2'],
    scores: { 'Player 1': 0, 'Player 2': 0 },
    currentPlayerIndex: 0,
    roundNumber: 1,
    passNote: 'Pass keeps score',
    lastAction: 'Ready',
    currentPlayer: 'Player 1',
    targetScore: 30,
    eliminatedPlayers: new Set(),
    passedPlayers: new Set(),
    starterPlayer: 'Player 1'
  };
}

describe('GameBoard layout', () => {
  test('renders radial wheel layout by default', () => {
    globalThis.__setResizeObserverWidth(1024);
    render(<GameBoard {...makeProps()} />);

    const shell = screen.getByTestId('wheel-board').closest('.answers-shell');
    expect(shell).toHaveAttribute('data-layout', 'wheel');
    const wheel = screen.getByTestId('wheel-board');
    expect(wheel).toBeInTheDocument();
    expect(within(wheel).getAllByRole('button')).toHaveLength(10);
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/reveal one peg/i);
  });

  test('falls back to grid on narrow container', () => {
    globalThis.__setResizeObserverWidth(640);
    render(<GameBoard {...makeProps()} />);

    const fallback = screen.getByTestId('fallback-grid');
    expect(fallback).toBeInTheDocument();
    expect(fallback.closest('.answers-shell')).toHaveAttribute('data-layout', 'fallback');
    expect(screen.queryByTestId('wheel-board')).not.toBeInTheDocument();
  });
});
