import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode')
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

describe('App gameplay flow', () => {
  test('plays a happy path with answer and pass', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);
    fetchNextCard
      .mockResolvedValueOnce(makeCard('c1', 0))
      .mockResolvedValueOnce(makeCard('c2', 1));

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start round/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /start round/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /answer/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /alpha/i }));
    fireEvent.click(screen.getByRole('button', { name: /answer/i }));
    fireEvent.click(screen.getByRole('button', { name: /lock in/i }));

    expect(screen.getByText(/last action:/i)).toHaveTextContent('+1');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /pass/i }));
    expect(screen.getByText(/last action:/i)).toHaveTextContent('passed');
  });
});
