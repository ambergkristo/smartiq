import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => {
  return {
    API_BASE: 'http://localhost:8080',
    fetchTopics: vi.fn(),
    fetchNextCard: vi.fn(),
    resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
    resolveTopicsErrorState: vi.fn(() => ({
      title: 'Backend is unreachable.',
      detail: 'Verify backend URL and that the API server is running.',
      kind: 'backend-unreachable'
    }))
  };
});

import { fetchTopics } from './api';

describe('App startup resilience', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  test('shows loading state before topics resolve', () => {
    fetchTopics.mockImplementation(() => new Promise(() => {}));

    render(<App />);

    expect(screen.getByText(/loading topics/i)).toBeInTheDocument();
  });

  test('shows actionable backend error with retry', async () => {
    fetchTopics.mockRejectedValue(new Error('network'));

    render(<App />);

    await waitFor(() => expect(screen.getByText(/backend is unreachable/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText(/check backend url/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open health/i })).toBeInTheDocument();
  });

  test('shows empty topics state', async () => {
    fetchTopics.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => expect(screen.getByText(/no topics available/i)).toBeInTheDocument());
  });

  test('renders setup screen when topics are available', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Math', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
    expect(screen.getByLabelText(/topic/i)).toBeInTheDocument();
  });

  test('retry button re-requests topics', async () => {
    fetchTopics
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce([{ topic: 'Science', count: 20 }]);

    render(<App />);

    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /start game/i })).toBeInTheDocument());
  });
});
