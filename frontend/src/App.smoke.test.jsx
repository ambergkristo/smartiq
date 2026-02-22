import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Could not load topics.',
      detail: 'Unexpected backend response.',
      kind: 'backend-unreachable'
    }))
  };
});

import { fetchNextCard, fetchTopics } from './api';

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

function findSummaryRow(player) {
  const summaryRows = screen.getAllByRole('row').slice(1);
  const row = summaryRows.find((entry) => within(entry).queryByText(player));
  expect(row).toBeTruthy();
  return row;
}

function readSummaryCells(row) {
  return Array.from(row.children).map((cell) => cell.textContent.trim());
}

describe('App core smoke flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('start game -> answer -> pass -> next round', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard
      .mockResolvedValueOnce(makeCard('s1', 0))
      .mockResolvedValueOnce(makeCard('s2', 1));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'peg-1' }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));
    await waitFor(() => expect(screen.getByText(/smoke question s2/i)).toBeInTheDocument());
  });

  test('three-player flow handles wrong-drop and pass transitions into summary stats', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard.mockResolvedValueOnce(makeCard('s3', 0));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob, Cara' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'peg-1' }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: 'peg-2' }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());

    const aliceRow = findSummaryRow('Alice');
    const bobRow = findSummaryRow('Bob');
    const caraRow = findSummaryRow('Cara');

    expect(readSummaryCells(aliceRow)).toEqual(['Alice', '1', '1', '0', '1']);
    expect(readSummaryCells(bobRow)).toEqual(['Bob', '0', '0', '1', '0']);
    expect(readSummaryCells(caraRow)).toEqual(['Cara', '0', '0', '0', '1']);
  });

  test('order category requires rank selection and wrong answer drops current player', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'History', count: 20 }]);
    fetchNextCard.mockResolvedValueOnce(makeOrderCard('order-s1'));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: /start game/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    expect(screen.getByTestId('action-hint')).toHaveTextContent(/choose rank/i);

    fireEvent.click(screen.getByRole('button', { name: 'peg-1' }));
    expect(screen.getByRole('button', { name: /answer/i })).toBeDisabled();

    const rankSelector = screen.getByRole('radiogroup', { name: /rank selector/i });
    fireEvent.click(within(rankSelector).getByRole('button', { name: '1' }));
    expect(screen.getByRole('button', { name: /answer/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());

    const aliceRow = findSummaryRow('Alice');
    const bobRow = findSummaryRow('Bob');
    expect(readSummaryCells(aliceRow)).toEqual(['Alice', '0', '0', '1', '0']);
    expect(readSummaryCells(bobRow)).toEqual(['Bob', '0', '0', '0', '1']);
  });
});
