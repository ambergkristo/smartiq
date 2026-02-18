import { render, screen, within } from '@testing-library/react';
import GameBoard from './GameBoard';

function makeProps() {
  return {
    card: {
      id: 'c1',
      topic: 'Math',
      difficulty: '2',
      language: 'en',
      question: 'Question?',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    },
    selectedIndexes: new Set(),
    toggleIndex: vi.fn(),
    phase: 'CHOOSING',
    onAnswer: vi.fn(),
    onConfirm: vi.fn(),
    onCancelConfirm: vi.fn(),
    onPass: vi.fn(),
    onNext: vi.fn(),
    isLast: false,
    players: ['Player 1', 'Player 2'],
    scores: { 'Player 1': 0, 'Player 2': 0 },
    currentPlayerIndex: 0,
    cardIndex: 0,
    roundLength: 10,
    passNote: 'Pass keeps score',
    lastAction: 'Ready',
    currentPlayer: 'Player 1',
    correctIndexes: new Set([0])
  };
}

describe('GameBoard layout', () => {
  test('renders radial wheel layout by default', () => {
    globalThis.__setResizeObserverWidth(1024);
    render(<GameBoard {...makeProps()} />);

    const wheel = screen.getByTestId('wheel-board');
    expect(wheel).toBeInTheDocument();
    expect(within(wheel).getAllByRole('button')).toHaveLength(10);
  });

  test('falls back to grid on narrow container', () => {
    globalThis.__setResizeObserverWidth(640);
    render(<GameBoard {...makeProps()} />);

    expect(screen.getByTestId('fallback-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('wheel-board')).not.toBeInTheDocument();
  });
});
