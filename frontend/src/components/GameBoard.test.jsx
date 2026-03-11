import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameBoard from './GameBoard';
import GameplayActionBar from './gameplay/GameplayActionBar';
import ScoreBoard from './gameplay/ScoreBoard';

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
    expect(screen.getByTestId('question-card')).toHaveTextContent('Question?');
    expect(screen.getByTestId('answer-state-row')).toBeInTheDocument();
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
    const props = makeProps();
    const { rerender } = render(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        selectedRank={props.selectedRank}
        controlsDisabled={false}
        canPass
        canAnswer={false}
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeDisabled();

    rerender(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        selectedRank={props.selectedRank}
        controlsDisabled={false}
        canPass
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );
    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeEnabled();
  });

  test('requires both rank and peg selection to enable ANSWER for ORDER', () => {
    const props = makeProps();
    const orderCard = { ...props.card, category: 'ORDER' };
    const { rerender } = render(
      <GameplayActionBar
        phase={props.phase}
        category={orderCard.category}
        selectedRank={null}
        controlsDisabled={false}
        canPass
        canAnswer={false}
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeDisabled();

    rerender(
      <GameplayActionBar
        phase={props.phase}
        category={orderCard.category}
        selectedRank={3}
        controlsDisabled={false}
        canPass
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );
    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeEnabled();
  });

  test('disables PASS until pass eligibility is true', () => {
    const props = makeProps();
    const { rerender } = render(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        selectedRank={props.selectedRank}
        controlsDisabled={false}
        canPass={false}
        canAnswer={false}
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    expect(screen.getByRole('button', { name: 'PASS' })).toBeDisabled();
    expect(screen.getByText(/before pass is available/i)).toBeInTheDocument();

    rerender(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        selectedRank={props.selectedRank}
        controlsDisabled={false}
        canPass
        canAnswer={false}
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onPass={props.onPass}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );
    expect(screen.getByRole('button', { name: 'PASS' })).toBeEnabled();
  });

  test('shows clear player status chips for turn, passed and out', () => {
    const props = makeProps();
    render(
      <ScoreBoard
        players={props.players}
        scores={props.scores}
        currentPlayerIndex={1}
        roundNumber={props.roundNumber}
        lastAction={props.lastAction}
        phaseLabel="choosing"
        currentPlayer="Player 2"
        targetScore={props.targetScore}
        eliminatedPlayers={new Set(['Player 1'])}
        passedPlayers={new Set()}
        starterPlayer={props.starterPlayer}
      />
    );

    expect(screen.getByText('TURN')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
    expect(screen.queryByText('READY')).not.toBeInTheDocument();
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

  test('renders a distinct reveal panel for resolved answers', () => {
    const props = makeProps();
    render(
      <GameBoard
        {...props}
        phase="RESOLVED"
        resolutionState={{
          outcome: 'correct',
          actingPlayer: 'Player 1',
          selectedOption: 'A',
          revealedOptions: ['A'],
          lastAction: 'Player 1 scored'
        }}
      />
    );

    expect(screen.getByTestId('reveal-panel')).toBeInTheDocument();
    expect(screen.getByTestId('correct-answer-display')).toHaveTextContent(/correct answer/i);
    expect(screen.getByTestId('resolution-summary')).toHaveTextContent(/correct answer locked/i);
    expect(screen.getByTestId('player-result-list')).toHaveTextContent(/correct/i);
    expect(screen.getByTestId('next-step-action-area')).toHaveTextContent(/next question/i);
    expect(screen.queryByTestId('wheel-board')).not.toBeInTheDocument();
  });

  test('supports keyboard flow for action buttons and announces state', async () => {
    globalThis.__setResizeObserverWidth(1024);
    const props = makeProps();
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <GameBoard {...props} />
        <GameplayActionBar
          phase={props.phase}
          category={props.card.category}
          nextTransition="turn"
          selectedRank={props.selectedRank}
          controlsDisabled={false}
          canPass
          canAnswer={false}
          onAnswer={props.onAnswer}
          onConfirm={props.onConfirm}
          onCancelConfirm={props.onCancelConfirm}
          onPass={props.onPass}
          onNext={props.onNext}
          currentPlayer={props.currentPlayer}
        />
      </>
    );

    const liveRegion = screen.getByTestId('board-live-region');
    expect(liveRegion).toHaveTextContent(/reveal one peg/i);
    expect(liveRegion).toHaveTextContent(/pass keeps score/i);
    expect(liveRegion).toHaveTextContent(/ready/i);

    const passButton = screen.getByRole('button', { name: 'PASS' });
    await waitFor(() => expect(passButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onPass).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <GameBoard {...props} selectedIndexes={new Set([0])} />
        <GameplayActionBar
          phase={props.phase}
          category={props.card.category}
          nextTransition="turn"
          selectedRank={props.selectedRank}
          controlsDisabled={false}
          canPass
          canAnswer
          onAnswer={props.onAnswer}
          onConfirm={props.onConfirm}
          onCancelConfirm={props.onCancelConfirm}
          onPass={props.onPass}
          onNext={props.onNext}
          currentPlayer={props.currentPlayer}
        />
      </>
    );
    const answerButton = screen.getByRole('button', { name: 'ANSWER' });
    answerButton.focus();
    await user.keyboard('{Enter}');
    expect(props.onAnswer).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <GameBoard {...props} phase="CONFIRMING" selectedIndexes={new Set([0])} />
        <GameplayActionBar
          phase="CONFIRMING"
          category={props.card.category}
          nextTransition="turn"
          selectedRank={props.selectedRank}
          controlsDisabled={false}
          canPass
          canAnswer
          onAnswer={props.onAnswer}
          onConfirm={props.onConfirm}
          onCancelConfirm={props.onCancelConfirm}
          onPass={props.onPass}
          onNext={props.onNext}
          currentPlayer={props.currentPlayer}
        />
      </>
    );
    expect(screen.getByTestId('phase-pill')).toHaveTextContent('CONFIRMING');
    const lockInButton = screen.getByRole('button', { name: 'LOCK IN' });
    await waitFor(() => expect(lockInButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <>
        <GameBoard
          {...props}
          phase="RESOLVED"
          resolutionState={{
            outcome: 'correct',
            actingPlayer: 'Player 1',
            selectedOption: 'A',
            revealedOptions: ['A'],
            lastAction: 'Player 1 scored'
          }}
        />
        <GameplayActionBar
          phase="RESOLVED"
          category={props.card.category}
          nextTransition="turn"
          selectedRank={props.selectedRank}
          controlsDisabled={false}
          canPass
          canAnswer
          onAnswer={props.onAnswer}
          onConfirm={props.onConfirm}
          onCancelConfirm={props.onCancelConfirm}
          onPass={props.onPass}
          onNext={props.onNext}
          currentPlayer={props.currentPlayer}
        />
      </>
    );
    const nextButton = screen.getByRole('button', { name: 'NEXT QUESTION' });
    await waitFor(() => expect(nextButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
});
