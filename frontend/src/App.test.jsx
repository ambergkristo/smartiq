import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextRandomCard: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Could not load topics.',
      detail: 'Unexpected backend response.',
      kind: 'backend-unreachable'
    }))
  };
});

import { fetchNextRandomCard, fetchTopics } from './api';

function makeCard(id, correctIndex = 0) {
  return {
    id,
    cardId: id,
    topic: 'Math',
    category: 'OPEN',
    difficulty: '2',
    language: 'en',
    question: `Question ${id}`,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'],
    correct: { correctIndex }
  };
}

describe('App Smart10 round flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('plays one-card round and advances to next round', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    fetchNextRandomCard
      .mockResolvedValueOnce(makeCard('c1', 0))
      .mockResolvedValueOnce(makeCard('c2', 1));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).toBeDisabled();
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    expect(startButton).toBeEnabled();
    fireEvent.click(startButton);

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    await waitFor(() =>
      expect(fetchNextRandomCard).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          gameId: expect.any(String)
        })
      )
    );

    fireEvent.click(screen.getByRole('button', { name: /peg-2/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await waitFor(() => expect(screen.getByText(/question c2/i)).toBeInTheDocument());
  });
});
