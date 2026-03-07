import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AdminConsole from './AdminConsole';

vi.mock('./api', () => ({
  createSupportCase: vi.fn(),
  listTenants: vi.fn(),
  getTenant: vi.fn(),
  getPilotSummary: vi.fn(),
  updateTenantBranding: vi.fn(),
  listMembers: vi.fn(),
  listSupportCases: vi.fn(),
  updateMember: vi.fn(),
  removeMember: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  listUsageEvents: vi.fn(),
  listUsageSummary: vi.fn(),
  listAuditEvents: vi.fn(),
  updateSupportCase: vi.fn(),
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
  adminApi.listUsageSummary.mockResolvedValue([]);
  adminApi.getPilotSummary.mockResolvedValue({
    riskStatus: 'tracking',
    recommendation: 'Continue collecting pilot evidence.',
    activated: false,
    repeatHost: false,
    paidConverted: false,
    openSupportCases: 0,
    resolvedSupportCases: 0,
    topOpenSupportCategory: null,
    planCode: 'GROWTH',
    subscriptionStatus: 'ACTIVE'
  });
  adminApi.listSupportCases.mockResolvedValue([]);
  adminApi.listAuditEvents.mockResolvedValue([]);
  adminApi.updateTenantBranding.mockResolvedValue(TENANT_DETAIL);
  adminApi.updateSettings.mockResolvedValue(SETTINGS);
  adminApi.updateSubscription.mockResolvedValue(SUBSCRIPTION);
  adminApi.updateMember.mockResolvedValue(MEMBERS[0]);
  adminApi.removeMember.mockResolvedValue(undefined);
  adminApi.createSupportCase.mockImplementation(async (_tenantId, payload) => ({
    caseId: 'sc_1',
    status: 'open',
    ...payload
  }));
  adminApi.updateSupportCase.mockImplementation(async (_tenantId, caseId, payload) => ({
    caseId,
    title: 'Join code confusion',
    category: 'onboarding',
    priority: 'high',
    owner: 'Founder',
    summary: 'Host could not find the join flow.',
    nextStep: 'Update onboarding copy.',
    ...payload
  }));
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

  test('renders pilot metrics summary from usage summary data', async () => {
    adminApi.listUsageSummary.mockResolvedValue([
      { eventType: 'host.session.started', totalValue: 3 },
      { eventType: 'host.session.completed', totalValue: 2 },
      { eventType: 'billing.checkout.started', totalValue: 1 },
      { eventType: 'billing.subscription.activated', totalValue: 0 }
    ]);
    adminApi.getPilotSummary.mockResolvedValue({
      riskStatus: 'conversion_risk',
      recommendation: 'Upgrade intent exists without paid activation; inspect checkout friction and pricing objections.',
      activated: true,
      repeatHost: true,
      paidConverted: false,
      openSupportCases: 1,
      resolvedSupportCases: 0,
      topOpenSupportCategory: 'billing',
      planCode: 'pilot-monthly',
      subscriptionStatus: 'trialing'
    });

    render(<AdminConsole />);

    await screen.findByRole('button', { name: /acme training/i });
    fireEvent.click(screen.getByRole('button', { name: /usage & audit/i }));

    const summary = await screen.findByTestId('pilot-summary');
    expect(summary).toHaveTextContent('Conversion Risk');
    expect(summary).toHaveTextContent('Top friction: Billing');

    const sellableReadiness = await screen.findByTestId('sellable-readiness');
    expect(sellableReadiness).toHaveTextContent('Repeat-host signal');
    expect(sellableReadiness).toHaveTextContent('0 paid activations');
    expect(sellableReadiness).toHaveTextContent('1 upgrade attempts');
    expect(sellableReadiness).toHaveTextContent('2 completed');
    expect(sellableReadiness).toHaveTextContent('3 launches tracked');
    expect(screen.getByTestId('sellable-readiness-gaps')).toHaveTextContent('Need canonical paid conversion from a repeat host.');
    expect(screen.getByTestId('sellable-readiness-gaps')).toHaveTextContent('Reduce open support friction in billing.');

    const metrics = await screen.findByTestId('pilot-metrics');
    expect(metrics).toHaveTextContent('Session launches');
    expect(metrics).toHaveTextContent('3');
    expect(metrics).toHaveTextContent('Completed sessions');
    expect(metrics).toHaveTextContent('2');
    expect(metrics).toHaveTextContent('Upgrade attempts');
    expect(metrics).toHaveTextContent('Paid activations');
  });

  test('logs and resolves support cases from usage tab', async () => {
    adminApi.getPilotSummary
      .mockResolvedValueOnce({
        riskStatus: 'tracking',
        recommendation: 'Continue collecting pilot evidence.',
        activated: false,
        repeatHost: false,
        paidConverted: false,
        openSupportCases: 0,
        resolvedSupportCases: 0,
        topOpenSupportCategory: null,
        planCode: 'GROWTH',
        subscriptionStatus: 'ACTIVE'
      })
      .mockResolvedValueOnce({
        riskStatus: 'needs_attention',
        recommendation: 'Resolve the highest open support category before widening pilots: onboarding.',
        activated: true,
        repeatHost: false,
        paidConverted: false,
        openSupportCases: 1,
        resolvedSupportCases: 0,
        topOpenSupportCategory: 'onboarding',
        planCode: 'GROWTH',
        subscriptionStatus: 'ACTIVE'
      })
      .mockResolvedValueOnce({
        riskStatus: 'tracking',
        recommendation: 'Continue collecting repeat-host and paid-retention evidence from real pilot traffic.',
        activated: true,
        repeatHost: false,
        paidConverted: false,
        openSupportCases: 0,
        resolvedSupportCases: 1,
        topOpenSupportCategory: null,
        planCode: 'GROWTH',
        subscriptionStatus: 'ACTIVE'
      });
    adminApi.createSupportCase.mockResolvedValue({
      caseId: 'sc_1',
      title: 'Join code confusion',
      category: 'onboarding',
      priority: 'high',
      status: 'open',
      owner: 'Founder',
      summary: 'Host could not find the join flow.',
      nextStep: 'Update onboarding copy.'
    });
    adminApi.updateSupportCase.mockResolvedValue({
      caseId: 'sc_1',
      title: 'Join code confusion',
      category: 'onboarding',
      priority: 'high',
      status: 'resolved',
      owner: 'Founder',
      summary: 'Host could not find the join flow.',
      nextStep: 'Update onboarding copy.',
      resolution: 'Resolved in admin pilot support loop.'
    });

    render(<AdminConsole />);

    await screen.findByRole('button', { name: /acme training/i });
    fireEvent.click(screen.getByRole('button', { name: /usage & audit/i }));

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Join code confusion' } });
    fireEvent.change(screen.getByLabelText(/owner/i), { target: { value: 'Founder' } });
    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: 'Host could not find the join flow.' } });
    fireEvent.change(screen.getByLabelText(/next step/i), { target: { value: 'Update onboarding copy.' } });
    fireEvent.click(screen.getByRole('button', { name: /log support case/i }));

    await waitFor(() => {
      expect(adminApi.createSupportCase).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({
          title: 'Join code confusion',
          owner: 'Founder'
        })
      );
    });

    const supportTable = await screen.findByTestId('support-cases');
    expect(supportTable).toHaveTextContent('Join code confusion');
    fireEvent.click(screen.getByRole('button', { name: /mark resolved/i }));

    await waitFor(() => {
      expect(adminApi.updateSupportCase).toHaveBeenCalledWith(
        'tenant-1',
        'sc_1',
        expect.objectContaining({ status: 'resolved' })
      );
    });
    expect(await screen.findByTestId('support-feedback')).toHaveTextContent('Support case resolved.');
  });
});
