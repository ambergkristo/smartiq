import { API_BASE } from '../api';

const ADMIN_BASE_PATH = '/internal/wl/tenants';

const KNOWN_ADMIN_CODES = new Set([
  'INVALID_TENANT_REQUEST',
  'FORBIDDEN_TENANT_ACCESS',
  'TENANT_NOT_FOUND',
  'USER_NOT_FOUND',
  'MEMBERSHIP_NOT_FOUND',
  'LAST_OWNER_PROTECTION',
  'DUPLICATE_MEMBERSHIP'
]);

export class AdminApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', detail = null } = {}) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function requireApiBase() {
  if (!API_BASE) {
    throw new AdminApiError('Missing VITE_API_BASE_URL for admin console.', {
      code: 'CONFIG_ERROR'
    });
  }
}

function buildUrl(path, query = null) {
  const url = new URL(`${API_BASE}${path}`);
  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body = null, query = null } = {}) {
  requireApiBase();
  const options = { method };
  if (body !== null) {
    options.headers = {
      'Content-Type': 'application/json'
    };
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(buildUrl(path, query), options);
  } catch {
    throw new AdminApiError('Admin API request failed.', {
      code: 'NETWORK_ERROR'
    });
  }

  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    const code = typeof payload?.code === 'string' ? payload.code : 'HTTP_ERROR';
    const detail = typeof payload?.error === 'string' ? payload.error : null;
    throw new AdminApiError(`Admin request failed: ${response.status}`, {
      status: response.status,
      code,
      detail
    });
  }

  return payload;
}

function trimOrNull(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTenantId(tenantId) {
  const normalized = trimOrNull(tenantId);
  if (!normalized) {
    throw new AdminApiError('tenantId is required.', {
      code: 'VALIDATION_ERROR'
    });
  }
  return normalized;
}

function normalizeMembershipId(membershipId) {
  const normalized = trimOrNull(membershipId);
  if (!normalized) {
    throw new AdminApiError('membershipId is required.', {
      code: 'VALIDATION_ERROR'
    });
  }
  return normalized;
}

export async function listTenants({ status, q } = {}) {
  return request(ADMIN_BASE_PATH, {
    query: { status, q }
  });
}

export async function getTenant(tenantId) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}`);
}

export async function updateTenantBranding(tenantId, payload) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/branding`, {
    method: 'PATCH',
    body: payload
  });
}

export async function listMembers(tenantId) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/members`);
}

export async function updateMember(tenantId, membershipId, payload) {
  return request(
    `${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/members/${encodeURIComponent(normalizeMembershipId(membershipId))}`,
    {
      method: 'PATCH',
      body: payload
    }
  );
}

export async function removeMember(tenantId, membershipId) {
  await request(
    `${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/members/${encodeURIComponent(normalizeMembershipId(membershipId))}`,
    {
      method: 'DELETE'
    }
  );
}

export async function getSettings(tenantId) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/settings`);
}

export async function updateSettings(tenantId, payload) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/settings`, {
    method: 'PUT',
    body: payload
  });
}

export async function getSubscription(tenantId) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/subscription`);
}

export async function updateSubscription(tenantId, payload) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/subscription`, {
    method: 'PUT',
    body: payload
  });
}

export async function listUsageEvents(tenantId, { eventType, limit } = {}) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/usage-events`, {
    query: { eventType, limit }
  });
}

export async function listUsageSummary(tenantId, { eventType, from, to } = {}) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/usage-summary`, {
    query: { eventType, from, to }
  });
}

export async function listAuditEvents(tenantId, { limit } = {}) {
  return request(`${ADMIN_BASE_PATH}/${encodeURIComponent(normalizeTenantId(tenantId))}/audit-events`, {
    query: { limit }
  });
}

export function resolveAdminError(error) {
  if (!(error instanceof AdminApiError)) {
    return {
      code: 'UNKNOWN_ERROR',
      title: 'Unexpected admin error.',
      detail: 'Retry and inspect backend logs.'
    };
  }

  if (error.code === 'CONFIG_ERROR') {
    return {
      code: error.code,
      title: 'Admin API is not configured.',
      detail: 'Set VITE_API_BASE_URL before opening /admin.'
    };
  }

  if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
    return {
      code: error.code,
      title: 'Admin API is unreachable.',
      detail: 'Check backend availability and CORS settings.'
    };
  }

  if (KNOWN_ADMIN_CODES.has(error.code)) {
    return {
      code: error.code,
      title: error.code,
      detail: error.detail || 'Tenant admin request failed.'
    };
  }

  if (error.status === 403) {
    return {
      code: 'FORBIDDEN_TENANT_ACCESS',
      title: 'FORBIDDEN_TENANT_ACCESS',
      detail: error.detail || 'Forbidden tenant access.'
    };
  }

  if (error.status === 404) {
    return {
      code: 'TENANT_NOT_FOUND',
      title: 'TENANT_NOT_FOUND',
      detail: error.detail || 'Tenant was not found.'
    };
  }

  return {
    code: error.code || 'HTTP_ERROR',
    title: error.code || 'HTTP_ERROR',
    detail: error.detail || `Request failed with status ${error.status || 0}.`
  };
}

export function toBrandingPayload(form) {
  return {
    appName: trimOrNull(form?.appName),
    logoUrl: trimOrNull(form?.logoUrl),
    primaryColor: trimOrNull(form?.primaryColor),
    secondaryColor: trimOrNull(form?.secondaryColor)
  };
}

export function toSubscriptionPayload(form) {
  return {
    planCode: trimOrNull(form?.planCode),
    status: trimOrNull(form?.status),
    billingCycle: trimOrNull(form?.billingCycle),
    trialEndsAt: trimOrNull(form?.trialEndsAt),
    currentPeriodStartsAt: trimOrNull(form?.currentPeriodStartsAt),
    currentPeriodEndsAt: trimOrNull(form?.currentPeriodEndsAt)
  };
}
