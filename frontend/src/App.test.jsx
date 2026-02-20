import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const { fetchNextCardMock } = vi.hoisted(() => ({
  fetchNextCardMock: vi.fn()
}));

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextCard: fetchNextCardMock,
    fetchNextRandomCard: fetchNextCardMock,
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Could not load topics.',
      detail: 'Unexpected backend response.',
      kind: 'backend-unreachable'
    }))
  };
});

import { fetchNextCard, fetchTopics } from './api';

function makeCard(id, correctIndex = 0) {
  return {
    id,
    topic: 'Math',
    difficulty: '2',
    language: 'en',
    question: `Question ${id}`,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'],
    correctIndex
  };
}

describe('App Smart10 round flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  test('plays one-card round and advances to next round', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    fetchNextCard
      .mockResolvedValueOnce(makeCard('c1', 0))
      .mockResolvedValueOnce(makeCard('c2', 1));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    const startButton = screen.getByRole('button', { name: /start game/i });
    expect(startButton).toBeDisabled();
    const playersInput = screen.getByLabelText(/players/i);
    fireEvent.change(playersInput, { target: { value: 'Alice, Bob' } });
    fireEvent.keyDown(playersInput, { key: 'Enter', code: 'Enter' });
    expect(screen.getByRole('button', { name: /alice/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bob/i })).toBeInTheDocument();
    expect(startButton).toBeEnabled();
    fireEvent.click(startButton);

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    await waitFor(() =>
      expect(fetchNextCard).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'en',
          gameId: expect.any(String)
        })
      )
    );
    fireEvent.click(screen.getByRole('button', { name: /beta/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));
    fireEvent.click(screen.getByRole('button', { name: /next card/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    fireEvent.click(screen.getByRole('button', { name: /next card/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: /round summary/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /next round/i }));

    await waitFor(() => expect(screen.getByText(/question c2/i)).toBeInTheDocument());
  });
});
