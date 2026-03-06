import {
  AdminApiError,
  listTenants,
  removeMember,
  resolveAdminError,
  toBrandingPayload,
  toSubscriptionPayload,
  updateSettings,
  updateTenantBranding
} from './api';

vi.mock('../api', () => ({
  API_BASE: 'http://localhost:8081'
}));

function mockJsonResponse({ status = 200, body = {} } = {}) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body)
  });
}

describe('admin api contract', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('uses internal wl list endpoint with query params', async () => {
    mockJsonResponse({
      body: [{ tenantId: 'tenant-1', name: 'Tenant 1' }]
    });

    const response = await listTenants({ status: 'ACTIVE', q: 'alpha' });

    expect(response).toHaveLength(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8081/internal/wl/tenants?status=ACTIVE&q=alpha',
      expect.objectContaining({ method: 'GET' })
    );
  });

  test('sends branding updates via PATCH', async () => {
    mockJsonResponse({
      body: {
        tenantId: 'tenant-1',
        branding: {
          appName: 'SmartIQ Academy'
        }
      }
    });

    await updateTenantBranding('tenant-1', {
      appName: 'SmartIQ Academy',
      logoUrl: null,
      primaryColor: '#123456',
      secondaryColor: '#abcdef'
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8081/internal/wl/tenants/tenant-1/branding',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({
          appName: 'SmartIQ Academy',
          logoUrl: null,
          primaryColor: '#123456',
          secondaryColor: '#abcdef'
        })
      })
    );
  });

  test('sends settings updates via PUT', async () => {
    mockJsonResponse({ body: { tenantId: 'tenant-1', settings: { locale: 'et' } } });

    await updateSettings('tenant-1', {
      settings: {
        locale: 'et'
      }
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8081/internal/wl/tenants/tenant-1/settings',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ settings: { locale: 'et' } })
      })
    );
  });

  test('uses delete member endpoint', async () => {
    mockJsonResponse({ status: 204, body: null });

    await removeMember('tenant-1', 'member-1');

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8081/internal/wl/tenants/tenant-1/members/member-1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('maps taxonomy errors for UI rendering', () => {
    const resolved = resolveAdminError(new AdminApiError('bad request', {
      status: 400,
      code: 'LAST_OWNER_PROTECTION',
      detail: 'Cannot remove the final active owner.'
    }));

    expect(resolved).toEqual({
      code: 'LAST_OWNER_PROTECTION',
      title: 'LAST_OWNER_PROTECTION',
      detail: 'Cannot remove the final active owner.'
    });
  });

  test('normalizes branding and subscription payloads', () => {
    expect(toBrandingPayload({
      appName: '  Demo App ',
      logoUrl: ' ',
      primaryColor: '#111111',
      secondaryColor: ''
    })).toEqual({
      appName: 'Demo App',
      logoUrl: null,
      primaryColor: '#111111',
      secondaryColor: null
    });

    expect(toSubscriptionPayload({
      planCode: ' growth ',
      status: '',
      billingCycle: ' monthly ',
      trialEndsAt: null,
      currentPeriodStartsAt: undefined,
      currentPeriodEndsAt: ' 2026-03-31T00:00:00Z '
    })).toEqual({
      planCode: 'growth',
      status: null,
      billingCycle: 'monthly',
      trialEndsAt: null,
      currentPeriodStartsAt: null,
      currentPeriodEndsAt: '2026-03-31T00:00:00Z'
    });
  });
});
