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
      options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    },
    selectedIndexes: new Set(),
    revealedIndexes: new Set(),
    wrongIndexes: new Set(),
    toggleIndex: vi.fn(),
    phase: 'QUESTION_ACTIVE',
    onAnswer: vi.fn(),
    onConfirm: vi.fn(),
    onCancelConfirm: vi.fn(),
    onNext: vi.fn(),
    players: ['Player 1', 'Player 2'],
    scores: { 'Player 1': 0, 'Player 2': 0 },
    currentPlayerIndex: 0,
    roundNumber: 1,
    lastAction: 'Ready',
    currentPlayer: 'Player 1',
    targetScore: 30,
    eliminatedPlayers: new Set(),
    starterPlayer: 'Player 1'
  };
}

describe('GameBoard layout', () => {
  test('renders a fixed 8-answer board', () => {
    render(<GameBoard {...makeProps()} />);

    const boardLayout = screen.getByTestId('gameplay-board-layout');
    expect(boardLayout).toBeInTheDocument();

    const questionPrompt = screen.getByTestId('question-prompt');
    const grid = screen.getByTestId('answer-grid');
    expect(grid).toHaveAttribute('data-layout', 'canonical-2x4');
    expect(questionPrompt.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(grid).getAllByRole('button')).toHaveLength(8);
    expect(screen.getByTestId('phase-pill')).toHaveTextContent('QUESTION ACTIVE');
  });

  test('answer bar requires an answer selection and offers no PASS action', () => {
    const props = makeProps();
    const { rerender } = render(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        controlsDisabled={false}
        canAnswer={false}
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'PASS' })).not.toBeInTheDocument();

    rerender(
      <GameplayActionBar
        phase={props.phase}
        category={props.card.category}
        controlsDisabled={false}
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    expect(screen.getByRole('button', { name: 'ANSWER' })).toBeEnabled();
  });

  test('shows lock-in panel when an answer is selected', () => {
    render(<GameBoard {...makeProps()} phase="ANSWER_SELECTED" selectedIndexes={new Set([0])} />);

    expect(screen.getByTestId('reveal-panel')).toBeInTheDocument();
    expect(screen.getByTestId('resolution-summary')).toHaveTextContent(/lock answer/i);
    expect(screen.getByTestId('player-result-list')).toHaveTextContent(/locked/i);
  });

  test('shows fail resolution with the submitted answer text', () => {
    render(
      <GameBoard
        {...makeProps()}
        phase="ROUND_FAIL"
        resolutionState={{
          outcome: 'fail',
          actingPlayer: 'Player 1',
          selectedOption: 'B',
          revealedOptions: ['A'],
          lastAction: 'Player 1 ended the round with a wrong answer'
        }}
      />
    );

    expect(screen.getByTestId('correct-answer-display')).toHaveTextContent(/submitted answer/i);
    expect(screen.getByTestId('correct-answer-display')).toHaveTextContent('B');
    expect(screen.getByTestId('resolution-summary')).toHaveTextContent(/round failed/i);
    expect(screen.getByTestId('player-result-list')).toHaveTextContent(/fail/i);
    expect(screen.getByTestId('next-step-action-area')).toHaveAttribute('data-tone', 'incorrect');
  });

  test('shows solo round XP and correct answers after resolution', () => {
    render(
      <GameBoard
        {...makeProps()}
        phase="ROUND_SUCCESS"
        mode="solo"
        roundNumber={10}
        resolutionState={{
          outcome: 'success',
          actingPlayer: 'Player 1',
          selectedOption: 'A',
          correctOptions: ['A', 'C'],
          roundLabel: 'Double Cherry',
          xpMultiplier: 3,
          xpMultiplierLabel: 'XP x3',
          xpGained: 600,
          totalXp: 900,
          lastAction: 'Board cleared'
        }}
      />
    );

    expect(screen.getByTestId('solo-round-result')).toHaveTextContent(/success/i);
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('Double Cherry');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('XP x3');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('600');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('900');
    expect(screen.getByTestId('solo-round-result')).toHaveTextContent('A, C');
    expect(screen.getByTestId('solo-round-result')).toHaveAttribute('data-outcome', 'success');
    expect(screen.getByTestId('solo-round-result-reward')).toBeInTheDocument();
  });

  test('shows Cherry round designation before answering begins', () => {
    render(<GameBoard {...makeProps()} mode="solo" roundNumber={5} />);

    expect(screen.getByTestId('question-card-round-indicator')).toHaveTextContent('Cherry Round');
    expect(screen.getByTestId('question-card-round-indicator')).toHaveTextContent('XP x2');
    expect(screen.getByTestId('board-status-bar')).toBeInTheDocument();
  });

  test('scoreboard only shows active and out states', () => {
    const props = makeProps();
    render(
      <ScoreBoard
        players={props.players}
        scores={props.scores}
        currentPlayerIndex={1}
        roundNumber={props.roundNumber}
        lastAction={props.lastAction}
        phaseLabel="question active"
        currentPlayer="Player 2"
        targetScore={props.targetScore}
        eliminatedPlayers={new Set(['Player 1'])}
        starterPlayer={props.starterPlayer}
      />
    );

    expect(screen.getByText('TURN')).toBeInTheDocument();
    expect(screen.getByText('OUT')).toBeInTheDocument();
    expect(screen.getByText('Active 1')).toBeInTheDocument();
    expect(screen.getByText('Out 1')).toBeInTheDocument();
  });

  test('scoreboard shows session XP in solo mode', () => {
    const props = makeProps();
    render(
      <ScoreBoard
        players={['Solo Player']}
        scores={{ 'Solo Player': 0 }}
        currentPlayerIndex={0}
        roundNumber={10}
        lastAction="Round 3 started"
        phaseLabel="question active"
        currentPlayer="Solo Player"
        targetScore={props.targetScore}
        eliminatedPlayers={new Set()}
        starterPlayer="Solo Player"
        mode="solo"
        sessionXp={300}
        lastRoundXp={100}
        profileName="Kai"
        profileLevel={2}
        profileXp={650}
        profileGamesPlayed={4}
        profileRoundsWon={3}
      />
    );

    expect(screen.getAllByText('Session XP')).toHaveLength(2);
    expect(screen.getAllByText('Double Cherry')).toHaveLength(2);
    expect(screen.getAllByText('XP x3')).toHaveLength(2);
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('Kai');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('650');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('2');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('300');
    expect(screen.getByTestId('solo-scoreboard')).toHaveTextContent('100');
  });

  test('supports keyboard flow for answer, lock-in and next', async () => {
    const props = makeProps();
    const user = userEvent.setup();
    const { rerender } = render(
      <GameplayActionBar
        phase="QUESTION_ACTIVE"
        category={props.card.category}
        controlsDisabled={false}
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    const answerButton = screen.getByRole('button', { name: 'ANSWER' });
    await waitFor(() => expect(answerButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onAnswer).toHaveBeenCalledTimes(1);

    rerender(
      <GameplayActionBar
        phase="ANSWER_SELECTED"
        category={props.card.category}
        controlsDisabled={false}
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    const lockInButton = screen.getByRole('button', { name: 'LOCK IN' });
    await waitFor(() => expect(lockInButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onConfirm).toHaveBeenCalledTimes(1);

    rerender(
      <GameplayActionBar
        phase="ROUND_REVEAL"
        category={props.card.category}
        controlsDisabled={false}
        canAnswer
        onAnswer={props.onAnswer}
        onConfirm={props.onConfirm}
        onCancelConfirm={props.onCancelConfirm}
        onNext={props.onNext}
        currentPlayer={props.currentPlayer}
      />
    );

    const nextButton = screen.getByRole('button', { name: 'NEXT' });
    await waitFor(() => expect(nextButton).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(props.onNext).toHaveBeenCalledTimes(1);
  });
});
