import {
  API_BASE,
  ApiError,
  fetchJson,
  normalizeBearerHeader,
  normalizeRequiredField,
  requireApiBase
} from './core';

const RUNTIME_AUTH_STORAGE_KEY = 'smartiq.runtimeAuth';

function readStoredRuntimeAuthContext() {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = localStorage.getItem(RUNTIME_AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const userEmail = String(parsed.userEmail || '').trim();
    const tenantId = String(parsed.tenantId || '').trim();
    const bearerToken = normalizeBearerHeader(parsed.bearerToken);
    if (!userEmail || !tenantId) {
      return null;
    }
    return {
      userEmail,
      tenantId,
      bearerToken
    };
  } catch {
    return null;
  }
}

function normalizeRuntimeAuthContext(input) {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const userEmail = String(input.userEmail || '').trim();
  const tenantId = String(input.tenantId || '').trim();
  const bearerToken = normalizeBearerHeader(input.bearerToken);
  if (!userEmail || !tenantId) {
    return null;
  }
  return {
    userEmail,
    tenantId,
    bearerToken
  };
}

export function getRuntimeAuthContext() {
  return readStoredRuntimeAuthContext();
}

export function setRuntimeAuthContext(input) {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const normalized = normalizeRuntimeAuthContext(input);
  if (!normalized) {
    localStorage.removeItem(RUNTIME_AUTH_STORAGE_KEY);
    return null;
  }
  localStorage.setItem(RUNTIME_AUTH_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearRuntimeAuthContext() {
  if (typeof localStorage === 'undefined') {
    return;
  }
  localStorage.removeItem(RUNTIME_AUTH_STORAGE_KEY);
}

export async function requestRuntimeAuthLink({ email, tenantId } = {}) {
  requireApiBase();
  const normalizedEmail = normalizeRequiredField(email, 'email').toLowerCase();
  const payload = { email: normalizedEmail };
  const normalizedTenantId = String(tenantId || '').trim();
  if (normalizedTenantId) {
    payload.tenantId = normalizedTenantId;
  }
  return fetchJson(`${API_BASE}/api/auth/request-link`, {
    method: 'POST',
    body: payload
  });
}

export async function completeRuntimeAuth({ challengeToken } = {}) {
  requireApiBase();
  const normalizedChallengeToken = normalizeRequiredField(challengeToken, 'challengeToken');
  return fetchJson(`${API_BASE}/api/auth/complete`, {
    method: 'POST',
    body: { challengeToken: normalizedChallengeToken }
  });
}

export async function logoutRuntimeAuth() {
  requireApiBase();
  return fetchJson(`${API_BASE}/api/auth/logout`, {
    method: 'POST'
  });
}

export function resolveRuntimeAuthHeaders() {
  const envBearer = normalizeBearerHeader(
    import.meta.env.VITE_RUNTIME_AUTH_BEARER_TOKEN
    || import.meta.env.VITE_RUNTIME_AUTH_TOKEN
    || import.meta.env.VITE_AUTH_BEARER_TOKEN
  );
  const envUserEmail = String(
    import.meta.env.VITE_RUNTIME_USER_EMAIL
    || import.meta.env.VITE_AUTH_USER_EMAIL
    || ''
  ).trim();
  const envTenantId = String(
    import.meta.env.VITE_RUNTIME_TENANT_ID
    || import.meta.env.VITE_AUTH_TENANT_ID
    || ''
  ).trim();
  const storedContext = readStoredRuntimeAuthContext();
  const bearer = envBearer || storedContext?.bearerToken || null;
  const userEmail = envUserEmail || storedContext?.userEmail || '';
  const tenantId = envTenantId || storedContext?.tenantId || '';

  const headers = {};
  if (bearer) {
    headers.Authorization = bearer;
  }
  if (userEmail && tenantId) {
    headers['X-SmartIQ-User-Email'] = userEmail;
    headers['X-SmartIQ-Tenant-Id'] = tenantId;
  }
  return headers;
}

export function hasRuntimeAuthContext() {
  return Object.keys(resolveRuntimeAuthHeaders()).length > 0;
}

export async function fetchTenantRuntimeSnapshot() {
  requireApiBase();
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    return null;
  }

  const me = await fetchJson(`${API_BASE}/api/me`, { headers });
  const [settings, branding, subscription, capabilities] = await Promise.all([
    fetchJson(`${API_BASE}/api/me/tenant-settings`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-branding`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-subscription`, { headers }),
    fetchJson(`${API_BASE}/api/me/tenant-capabilities`, { headers })
  ]);

  return {
    me,
    settings,
    branding,
    subscription,
    capabilities
  };
}

function requireRuntimeHeaders(message) {
  const headers = resolveRuntimeAuthHeaders();
  if (Object.keys(headers).length === 0) {
    throw new ApiError(message, 0, 'UNAUTHENTICATED');
  }
  return headers;
}

export async function updateRuntimeTenantBranding({ appName, logoUrl, primaryColor, secondaryColor } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for tenant branding updates.');

  return fetchJson(`${API_BASE}/api/me/tenant-branding`, {
    method: 'PATCH',
    headers,
    body: {
      appName: normalizeRequiredField(appName, 'appName'),
      logoUrl: String(logoUrl || '').trim() || null,
      primaryColor: normalizeRequiredField(primaryColor, 'primaryColor'),
      secondaryColor: normalizeRequiredField(secondaryColor, 'secondaryColor')
    }
  });
}

export async function upsertRuntimeSessionTemplate(templateId, { name, topic, language, theme, players } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for session templates.');
  const normalizedTemplateId = normalizeRequiredField(templateId, 'templateId');
  const normalizedPlayers = Array.isArray(players)
    ? players.map((player) => String(player || '').trim()).filter(Boolean)
    : [];
  if (normalizedPlayers.length === 0) {
    throw new ApiError('players is required', 0, 'VALIDATION_ERROR');
  }

  return fetchJson(`${API_BASE}/api/me/session-templates/${encodeURIComponent(normalizedTemplateId)}`, {
    method: 'PUT',
    headers,
    body: {
      name: normalizeRequiredField(name, 'name'),
      topic: String(topic || '').trim() || null,
      language: normalizeRequiredField(language, 'language').toLowerCase(),
      theme: normalizeRequiredField(theme, 'theme').toLowerCase(),
      players: normalizedPlayers
    }
  });
}

export async function deleteRuntimeSessionTemplate(templateId) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for session templates.');
  const normalizedTemplateId = normalizeRequiredField(templateId, 'templateId');
  return fetchJson(`${API_BASE}/api/me/session-templates/${encodeURIComponent(normalizedTemplateId)}`, {
    method: 'DELETE',
    headers
  });
}

export async function upsertRuntimeSessionReviewNote(gameId, { note } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for session review notes.');
  const normalizedGameId = normalizeRequiredField(gameId, 'gameId');
  return fetchJson(`${API_BASE}/api/me/session-review-notes/${encodeURIComponent(normalizedGameId)}`, {
    method: 'PUT',
    headers,
    body: {
      note: normalizeRequiredField(note, 'note')
    }
  });
}

export async function deleteRuntimeSessionReviewNote(gameId) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for session review notes.');
  const normalizedGameId = normalizeRequiredField(gameId, 'gameId');
  return fetchJson(`${API_BASE}/api/me/session-review-notes/${encodeURIComponent(normalizedGameId)}`, {
    method: 'DELETE',
    headers
  });
}

export async function fetchTenantCapabilities() {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for tenant capabilities.');
  return fetchJson(`${API_BASE}/api/me/tenant-capabilities`, { headers });
}

export async function fetchTenantAuditEvents({ limit } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for tenant audit events.');

  const url = new URL(`${API_BASE}/api/me/tenant-audit-events`);
  if (Number.isInteger(limit) && limit > 0) {
    url.searchParams.set('limit', String(limit));
  }
  return fetchJson(url.toString(), { headers });
}

export async function fetchTenantUsageSummary({ eventType, from, to } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for tenant usage summary.');

  const url = new URL(`${API_BASE}/api/me/tenant-usage-summary`);
  if (String(eventType || '').trim()) {
    url.searchParams.set('eventType', String(eventType).trim());
  }
  if (String(from || '').trim()) {
    url.searchParams.set('from', String(from).trim());
  }
  if (String(to || '').trim()) {
    url.searchParams.set('to', String(to).trim());
  }
  return fetchJson(url.toString(), { headers });
}

export async function bootstrapOnboardingTenant({ workspaceName, ownerEmail, ownerDisplayName } = {}) {
  requireApiBase();
  const normalizedWorkspaceName = normalizeRequiredField(workspaceName, 'workspaceName');
  const normalizedOwnerEmail = normalizeRequiredField(ownerEmail, 'ownerEmail').toLowerCase();
  if (!normalizedOwnerEmail.includes('@') || normalizedOwnerEmail.startsWith('@') || normalizedOwnerEmail.endsWith('@')) {
    throw new ApiError('ownerEmail must be a valid address', 0, 'VALIDATION_ERROR');
  }
  const normalizedOwnerDisplayName = String(ownerDisplayName || '').trim();

  const payload = {
    workspaceName: normalizedWorkspaceName,
    ownerEmail: normalizedOwnerEmail
  };
  if (normalizedOwnerDisplayName) {
    payload.ownerDisplayName = normalizedOwnerDisplayName;
  }

  return fetchJson(`${API_BASE}/api/onboarding/bootstrap`, {
    method: 'POST',
    body: payload
  });
}

export async function initiateCheckoutSession({ planCode, billingCycle } = {}) {
  requireApiBase();
  const headers = requireRuntimeHeaders('Runtime auth context is required for checkout.');
  const normalizedPlanCode = normalizeRequiredField(planCode, 'planCode').toLowerCase();
  const normalizedBillingCycle = normalizeRequiredField(billingCycle, 'billingCycle').toLowerCase();

  return fetchJson(`${API_BASE}/api/billing/checkout`, {
    method: 'POST',
    headers,
    body: {
      planCode: normalizedPlanCode,
      billingCycle: normalizedBillingCycle
    }
  });
}
