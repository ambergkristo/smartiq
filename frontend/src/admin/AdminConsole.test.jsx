import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminConsole from './AdminConsole';

vi.mock('./api', () => ({
  listTenants: vi.fn(),
  getTenant: vi.fn(),
  updateTenantBranding: vi.fn(),
  listMembers: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  listUsageEvents: vi.fn(),
  listAuditEvents: vi.fn(),
  resolveAdminError: vi.fn((error) => ({
    code: error?.code || 'HTTP_ERROR',
    title: error?.code || 'HTTP_ERROR',
    detail: error?.detail || 'Request failed.'
  })),
  toBrandingPayload: vi.fn((input) => input),
  toSubscriptionPayload: vi.fn((input) => input)
}));

import * as adminApi from './api';

const TENANT = {
  tenantId: 'tenant-1',
  slug: 'acme',
  name: 'Acme Training',
  status: 'ACTIVE'
};

const TENANT_DETAIL = {
  tenantId: 'tenant-1',
  slug: 'acme',
  name: 'Acme Training',
  status: 'ACTIVE',
  branding: {
    appName: 'Acme Quiz',
    logoUrl: 'https://cdn.example.com/logo.png',
    primaryColor: '#112233',
    secondaryColor: '#223344'
  }
};

const MEMBERS = [
  {
    membershipId: 'membership-1',
    tenantId: 'tenant-1',
    userId: 'user-1',
    email: 'owner@example.com',
    role: 'OWNER',
    status: 'ACTIVE'
  }
];

const SETTINGS = {
  tenantId: 'tenant-1',
  settings: {
    locale: 'et',
    cardPack: 'default'
  }
};

const SUBSCRIPTION = {
  tenantId: 'tenant-1',
  planCode: 'GROWTH',
  status: 'ACTIVE',
  billingCycle: 'MONTHLY',
  trialEndsAt: '2026-04-01T00:00:00Z',
  currentPeriodStartsAt: '2026-03-01T00:00:00Z',
  currentPeriodEndsAt: '2026-03-31T00:00:00Z'
};

function primeDefaultMocks() {
  adminApi.listTenants.mockResolvedValue([TENANT]);
  adminApi.getTenant.mockResolvedValue(TENANT_DETAIL);
  adminApi.listMembers.mockResolvedValue(MEMBERS);
  adminApi.getSettings.mockResolvedValue(SETTINGS);
  adminApi.getSubscription.mockResolvedValue(SUBSCRIPTION);
  adminApi.listUsageEvents.mockResolvedValue([]);
  adminApi.listAuditEvents.mockResolvedValue([]);
  adminApi.updateTenantBranding.mockResolvedValue(TENANT_DETAIL);
  adminApi.updateSettings.mockResolvedValue(SETTINGS);
  adminApi.updateSubscription.mockResolvedValue(SUBSCRIPTION);
  adminApi.updateMember.mockResolvedValue(MEMBERS[0]);
  adminApi.removeMember.mockResolvedValue(undefined);
}

describe('AdminConsole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    primeDefaultMocks();
  });

  test('lists tenants and saves branding', async () => {
    const updatedDetail = {
      ...TENANT_DETAIL,
      branding: {
        ...TENANT_DETAIL.branding,
        appName: 'Acme SmartIQ'
      }
    };
    adminApi.updateTenantBranding.mockResolvedValue(updatedDetail);

    render(<AdminConsole />);

    await screen.findByRole('button', { name: /acme training/i });
    await waitFor(() => {
      expect(screen.getByLabelText(/logo url/i)).toHaveValue('https://cdn.example.com/logo.png');
    });

    const appNameInput = screen.getByLabelText(/app name/i);
    fireEvent.change(appNameInput, { target: { value: 'Acme SmartIQ' } });
    fireEvent.click(screen.getByRole('button', { name: /save branding/i }));

    await waitFor(() => {
      expect(adminApi.updateTenantBranding).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          appName: 'Acme SmartIQ'
        })
      );
    });

    expect(screen.getByTestId('branding-feedback')).toHaveTextContent('Branding saved.');
  });

  test('shows validation error for invalid settings JSON', async () => {
    render(<AdminConsole />);

    await screen.findByRole('button', { name: /acme training/i });
    fireEvent.click(screen.getByRole('button', { name: /^settings$/i }));

    const settingsInput = screen.getByLabelText(/settings json/i);
    fireEvent.change(settingsInput, { target: { value: '{ invalid json' } });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    expect(screen.getByTestId('settings-feedback')).toHaveTextContent('Validation: settings JSON must be valid.');
    expect(adminApi.updateSettings).not.toHaveBeenCalled();
  });

  test('renders API taxonomy error on member update failure', async () => {
    adminApi.updateMember.mockRejectedValue({
      code: 'LAST_OWNER_PROTECTION',
      detail: 'Cannot remove the final active owner.'
    });
    adminApi.resolveAdminError.mockReturnValue({
      code: 'LAST_OWNER_PROTECTION',
      title: 'LAST_OWNER_PROTECTION',
      detail: 'Cannot remove the final active owner.'
    });

    render(<AdminConsole />);

    await screen.findByRole('button', { name: /acme training/i });
    fireEvent.click(screen.getByRole('button', { name: /^members$/i }));

    const row = screen.getByText('owner@example.com').closest('tr');
    expect(row).toBeTruthy();
    fireEvent.click(within(row).getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(screen.getByTestId('members-feedback')).toHaveTextContent(
        'LAST_OWNER_PROTECTION: Cannot remove the final active owner.'
      );
    });
  });
});
