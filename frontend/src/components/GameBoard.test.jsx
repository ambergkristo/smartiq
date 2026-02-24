import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByTestId('phase-pill')).toHaveTextContent('CHOOSING');
  });

  test('falls back to grid on narrow container', () => {
    globalThis.__setResizeObserverWidth(640);
    render(<GameBoard {...makeProps()} />);

    const fallback = screen.getByTestId('fallback-grid');
    expect(fallback).toBeInTheDocument();
    expect(fallback.closest('.answers-shell')).toHaveAttribute('data-layout', 'fallback');
    expect(screen.queryByTestId('wheel-board')).not.toBeInTheDocument();
  });

  test('disables ANSWER until a peg is selected for non-ORDER categories', () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    const { rerender } = render(<GameBoard {...props} />);

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeDisabled();

    rerender(<GameBoard {...props} selectedIndexes={new Set([0])} />);
    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeEnabled();
  });

  test('requires both rank and peg selection to enable ANSWER for ORDER', () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    const orderCard = { ...props.card, category: 'ORDER' };
    const { rerender } = render(<GameBoard {...props} card={orderCard} selectedIndexes={new Set([0])} selectedRank={null} />);

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeDisabled();

    rerender(<GameBoard {...props} card={orderCard} selectedIndexes={new Set([0])} selectedRank={3} />);
    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeEnabled();
  });

  test('shows clear player status chips for turn, passed and out', () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    render(
      <GameBoard
        {...props}
        currentPlayerIndex={1}
        eliminatedPlayers={new Set(['Player 1'])}
        passedPlayers={new Set()}
      />
    );

    expect(screen.getByText('TURN')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
    expect(screen.queryByText('WAITING')).not.toBeInTheDocument();
    expect(screen.getByText('Active 1')).toBeInTheDocument();
    expect(screen.getByText('Out 1')).toBeInTheDocument();
  });

  test('shows marker symbols and aria state labels for revealed pegs', () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    render(
      <GameBoard
        {...props}
        selectedIndexes={new Set([2])}
        revealedIndexes={new Set([0])}
        wrongIndexes={new Set([1])}
      />
    );

    expect(screen.getByRole('button', { name: /peg-1 correct/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /peg-2 wrong/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /peg-3 selected/i })).toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(1);
    expect(screen.getAllByText('✗')).toHaveLength(1);
    expect(screen.getAllByText('◎')).toHaveLength(1);
  });

  test('supports keyboard flow for action buttons and announces state', async () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    const user = userEvent.setup();
    const { rerender } = render(<GameBoard {...props} />);

    const liveRegion = screen.getByTestId('board-live-region');
    expect(liveRegion).toHaveTextContent(/reveal one peg/i);
    expect(liveRegion).toHaveTextContent(/pass keeps score/i);
    expect(liveRegion).toHaveTextContent(/ready/i);

    const passButton = screen.getByRole('button', { name: 'PASS' });
    await waitFor(() => expect(passButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onPass).toHaveBeenCalledTimes(1);

    rerender(<GameBoard {...props} selectedIndexes={new Set([0])} />);
    const answerButton = screen.getByRole('button', { name: 'ANSWER' });
    answerButton.focus();
    await user.keyboard('{Enter}');
    expect(props.onAnswer).toHaveBeenCalledTimes(1);

    rerender(<GameBoard {...props} phase="CONFIRMING" />);
    expect(screen.getByTestId('phase-pill')).toHaveTextContent('CONFIRMING');
    const lockInButton = screen.getByRole('button', { name: 'LOCK IN' });
    await waitFor(() => expect(lockInButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);

    rerender(<GameBoard {...props} phase="RESOLVED" />);
    const nextButton = screen.getByRole('button', { name: 'NEXT' });
    await waitFor(() => expect(nextButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
});
