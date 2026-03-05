import { fireEvent, render, screen, within } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    fetchTenantRuntimeSnapshot: vi.fn(),
    hasRuntimeAuthContext: vi.fn(() => false),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Could not load topics.',
      detail: 'Unexpected backend response.',
      kind: 'backend-unreachable'
    }))
  };
});

import { fetchNextCard, fetchTopics, resolveCardErrorMessage } from './api';
const QUERY_TIMEOUT = 5000;

function makeCard(id, correctIndex) {
  return {
    id,
    cardId: id,
    topic: 'History',
    category: 'OPEN',
    difficulty: '2',
    language: 'en',
    question: `Smoke question ${id}`,
    options: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    correct: { correctIndex }
  };
}

function makeOrderCard(id) {
  return {
    id,
    cardId: id,
    topic: 'History',
    category: 'ORDER',
    difficulty: '2',
    language: 'en',
    question: `Order smoke question ${id}`,
    options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
    correct: { rankByIndex: [2, 1, 3, 4, 5, 6, 7, 8, 9, 10] }
  };
}

function makePerfectOrderCard(id) {
  return {
    id,
    cardId: id,
    topic: 'History',
    category: 'ORDER',
    difficulty: '2',
    language: 'en',
    question: `Perfect order smoke question ${id}`,
    options: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'],
    correct: { rankByIndex: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }
  };
}

function findSummaryRow(player) {
  const summaryRows = screen.getAllByRole('row').slice(1);
  const row = summaryRows.find((entry) => within(entry).queryByText(player));
  expect(row).toBeTruthy();
  return row;
}

function readSummaryCells(row) {
  return Array.from(row.children).map((cell) => cell.textContent.trim());
}

async function startGameWithPlayers(playersText) {
  await screen.findByRole('button', { name: /start game/i }, { timeout: QUERY_TIMEOUT });
  const playersInput = screen.getByLabelText(/players/i);
  fireEvent.change(playersInput, { target: { value: playersText } });
  fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
  fireEvent.click(screen.getByRole('button', { name: /start game/i }));
  await screen.findByRole('button', { name: /answer/i }, { timeout: QUERY_TIMEOUT });
}

async function waitForRoundSummary() {
  await screen.findByRole('heading', { name: /round summary/i }, { timeout: QUERY_TIMEOUT });
}

async function playPerfectOrderRound() {
  const rankSelector = await screen.findByRole('radiogroup', { name: /rank selector/i }, { timeout: QUERY_TIMEOUT });
  for (let index = 1; index <= 10; index += 1) {
    fireEvent.click(within(rankSelector).getByRole('button', { name: String(index) }));
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^peg-${index}\\b`, 'i') }));
    const answerButton = screen.getByRole('button', { name: /answer/i });
    expect(answerButton).toBeEnabled();
    fireEvent.click(answerButton);

    const lockInButton = screen.getByRole('button', { name: /lock in/i });
    expect(lockInButton).toBeEnabled();
    fireEvent.click(lockInButton);

    const nextButton = await screen.findByRole('button', { name: /next/i }, { timeout: QUERY_TIMEOUT });
    expect(nextButton).toBeEnabled();
    fireEvent.click(nextButton);
    if (index < 10) {
      await screen.findByRole('button', { name: /answer/i }, { timeout: QUERY_TIMEOUT });
    }
  }
}

describe('App core smoke flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchTopics.mockReset();
    fetchNextCard.mockReset();
    resolveCardErrorMessage.mockReset().mockReturnValue('Fallback mode');
    localStorage.clear();
  });

  test('start game -> answer -> round end -> next round', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard
      .mockResolvedValueOnce(makeCard('s1', 0))
      .mockResolvedValueOnce(makeCard('s2', 1));

    render(<App />);
    await startGameWithPlayers('Alice, Bob');

    fireEvent.click(screen.getByRole('button', { name: /^peg-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /^peg-2\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitForRoundSummary();
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    await screen.findByText(/smoke question s2/i, {}, { timeout: QUERY_TIMEOUT });
  }, 15000);

  test('three-player flow handles wrong-drop transitions into summary stats', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard.mockResolvedValueOnce(makeCard('s3', 0));

    render(<App />);
    await startGameWithPlayers('Alice, Bob, Cara');

    fireEvent.click(screen.getByRole('button', { name: /^peg-1\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /^peg-2\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /^peg-3\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitForRoundSummary();

    const aliceRow = findSummaryRow('Alice');
    const bobRow = findSummaryRow('Bob');
    const caraRow = findSummaryRow('Cara');

    expect(readSummaryCells(aliceRow)).toEqual(['Alice', '1', '1', '0', '1']);
    expect(readSummaryCells(bobRow)).toEqual(['Bob', '0', '0', '1', '0']);
    expect(readSummaryCells(caraRow)).toEqual(['Cara', '0', '0', '1', '0']);
  }, 15000);

  test('order category requires rank selection and wrong answer drops current player', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard.mockResolvedValueOnce(makeOrderCard('order-s1'));

    render(<App />);
    await startGameWithPlayers('Alice, Bob');
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/choose rank/i);

    fireEvent.click(screen.getByRole('button', { name: /^peg-1\b/i }));
    expect(screen.getByRole('button', { name: /answer/i })).toBeDisabled();

    const rankSelector = screen.getByRole('radiogroup', { name: /rank selector/i });
    fireEvent.click(within(rankSelector).getByRole('button', { name: '1' }));
    expect(screen.getByRole('button', { name: /answer/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(within(rankSelector).getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: /^peg-2\b/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitForRoundSummary();

    const aliceRow = findSummaryRow('Alice');
    const bobRow = findSummaryRow('Bob');
    expect(readSummaryCells(aliceRow)).toEqual(['Alice', '0', '0', '1', '0']);
    expect(readSummaryCells(bobRow)).toEqual(['Bob', '1', '1', '0', '1']);
  }, 15000);

  test('game ends at 30 points after three perfect ORDER rounds', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard
      .mockResolvedValueOnce(makePerfectOrderCard('p1'))
      .mockResolvedValueOnce(makePerfectOrderCard('p2'))
      .mockResolvedValueOnce(makePerfectOrderCard('p3'));

    render(<App />);
    await startGameWithPlayers('Alice');

    await playPerfectOrderRound();
    await waitForRoundSummary();
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await playPerfectOrderRound();
    await waitForRoundSummary();
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await playPerfectOrderRound();
    await screen.findByRole('heading', { name: /game summary/i }, { timeout: QUERY_TIMEOUT });
    expect(screen.getByText(/alice reached 30 points\./i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /change topic/i }));
    await screen.findByRole('button', { name: /start game/i }, { timeout: QUERY_TIMEOUT });
    expect(screen.queryByRole('heading', { name: /game summary/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/any topic \| en/i);
  }, 120000);

  test('deck exhausted shows unified recovery actions and allows returning to filters', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    resolveCardErrorMessage.mockReturnValue('No playable cards for this filter. No cards available for language=en, topic=History.');
    fetchNextCard.mockRejectedValue(new Error('404'));

    render(<App />);

    await screen.findByRole('button', { name: /start game/i }, { timeout: QUERY_TIMEOUT });
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await screen.findByText(/no playable cards for this filter\./i, {}, { timeout: QUERY_TIMEOUT });
    expect(screen.getByRole('button', { name: /change filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restart game/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /change filters/i }));
    await screen.findByRole('button', { name: /start game/i }, { timeout: QUERY_TIMEOUT });
    expect(screen.getByTestId('active-filter')).toHaveTextContent(/any topic \| en/i);
  }, 15000);
});
