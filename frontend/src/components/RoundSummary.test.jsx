import { fireEvent, render, screen } from '@testing-library/react';
import RoundSummary from './RoundSummary';

describe('RoundSummary', () => {
  test('renders a solo post-game recap with progress metrics and replay actions', () => {
    const onPlayAgain = vi.fn();
    const onRestart = vi.fn();

    render(
      <RoundSummary
        players={['Kai']}
        scores={{ Kai: 30 }}
        stats={{ Kai: { correct: 6, wrong: 1, passes: 0 } }}
        roundNumber={7}
        winner="Kai"
        mode="solo"
        sessionXp={420}
        profileName="Kai"
        profileLevel={4}
        profileXp={1840}
        profileGamesPlayed={12}
        profileRoundsWon={9}
        onNextRound={() => {}}
        onRestart={onRestart}
        onPlayAgain={onPlayAgain}
      />
    );

    expect(screen.getByTestId('round-summary')).toHaveAttribute('data-mode', 'solo');
    expect(screen.getByTestId('round-summary')).toHaveTextContent('Game Summary');
    expect(screen.getByTestId('round-summary-progress')).toHaveTextContent('Total XP');
    expect(screen.getByTestId('round-summary-progress')).toHaveTextContent('1840');
    expect(screen.getByTestId('round-summary-progress')).toHaveTextContent('Session XP');
    expect(screen.getByTestId('round-summary-progress')).toHaveTextContent('420');
    expect(screen.getByTestId('summary-standings')).toHaveTextContent('Winner');

    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    fireEvent.click(screen.getByRole('button', { name: /change topic/i }));

    expect(onPlayAgain).toHaveBeenCalledTimes(1);
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  test('renders multiplayer round summary with next-round action', () => {
    const onNextRound = vi.fn();

    render(
      <RoundSummary
        players={['Host One', 'Alice', 'Bob']}
        scores={{ 'Host One': 12, Alice: 18, Bob: 5 }}
        stats={{
          'Host One': { correct: 2, wrong: 1, passes: 0 },
          Alice: { correct: 4, wrong: 0, passes: 1 },
          Bob: { correct: 1, wrong: 2, passes: 1 }
        }}
        roundNumber={4}
        onNextRound={onNextRound}
        onRestart={() => {}}
        onPlayAgain={() => {}}
      />
    );

    expect(screen.getByTestId('round-summary')).toHaveAttribute('data-state', 'round-complete');
    expect(screen.getByTestId('summary-standings')).toHaveTextContent('Alice');
    expect(screen.getByTestId('summary-standings')).toHaveTextContent('#1');
    expect(screen.getByRole('button', { name: /next round/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    expect(onNextRound).toHaveBeenCalledTimes(1);
  });
});
