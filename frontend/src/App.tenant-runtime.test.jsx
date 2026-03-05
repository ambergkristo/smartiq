import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

vi.mock('./api', () => ({
  API_BASE: 'http://localhost:8080',
  fetchTopics: vi.fn(),
  fetchNextCard: vi.fn(),
  fetchTenantRuntimeSnapshot: vi.fn(),
  hasRuntimeAuthContext: vi.fn(),
  resolveCardErrorMessage: vi.fn(() => 'Fallback mode'),
  resolveTopicsErrorState: vi.fn(() => ({
    title: 'Could not load topics.',
    detail: 'Unexpected backend response.',
    kind: 'backend-unreachable'
  }))
}));

import { fetchTenantRuntimeSnapshot, fetchTopics, hasRuntimeAuthContext } from './api';

describe('App tenant runtime integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--accent');
    document.documentElement.style.removeProperty('--accent2');
    document.title = 'SmartIQ';
  });

  test('applies tenant branding + settings from runtime me endpoints', async () => {
    fetchTopics.mockResolvedValue([{ topic: 'Science', count: 12 }]);
    hasRuntimeAuthContext.mockReturnValue(true);
    fetchTenantRuntimeSnapshot.mockResolvedValue({
      me: {
        email: 'owner@northwind.test',
        selectedTenantId: 'tenant-northwind'
      },
      settings: {
        settings: {
          schemaVersion: 1,
          theme: 'ocean'
        }
      },
      branding: {
        branding: {
          appName: 'Northwind Quiz',
          primaryColor: '#223344',
          secondaryColor: '#556677'
        }
      },
      subscription: {
        planCode: 'pilot-monthly'
      }
    });

    render(<App />);

    await screen.findByRole('button', { name: /start game/i });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Northwind Quiz' })).toBeInTheDocument();
    });
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('tenant-northwind');
    expect(screen.getByTestId('tenant-runtime-hint')).toHaveTextContent('pilot-monthly');
    expect(document.title).toBe('Northwind Quiz');
    expect(document.documentElement.getAttribute('data-theme')).toBe('ocean');
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#223344');
    expect(document.documentElement.style.getPropertyValue('--accent2')).toBe('#556677');
  });
});
