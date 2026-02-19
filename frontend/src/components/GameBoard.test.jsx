import { fireEvent, render, screen, within } from '@testing-library/react';
import GameBoard from './GameBoard';

function makeProps() {
  return {
    card: {
      id: 'c1',
      category: 'NUMBER',
      topic: 'Science',
      difficulty: '2',
      language: 'en',
      question: 'Which option is the right answer?',
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    },
    selectedIndexes: new Set(),
    revealedIndexes: new Set(),
    wrongIndexes: new Set(),
    toggleIndex: vi.fn(),
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
    correctIndexes: new Set([0])
    ,
    numberGuess: '',
    orderRank: 1,
    onNumberGuessChange: vi.fn(),
    onOrderRankChange: vi.fn()
  };
}

describe('GameBoard layout', () => {
  test('renders centered smart10 board with 10 pegs', () => {
    globalThis.__setResizeObserverWidth(1024);
    render(<GameBoard {...makeProps()} />);

    const board = screen.getByTestId('smart10-board');
    expect(board).toBeInTheDocument();
    expect(within(board).getAllByRole('button', { name: /marker/i })).toHaveLength(10);
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/reveal a marker/i);
  });

  test('reveals peg text when marker is clicked', () => {
    render(<GameBoard {...makeProps()} />);

    const marker1 = screen.getByRole('button', { name: 'Marker 1' });
    expect(marker1).toHaveTextContent('1');

    fireEvent.click(marker1);

    expect(marker1).toHaveTextContent('A');
  });
});
