export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
const SAMPLE_MODE_FLAG = String(import.meta.env.VITE_SAMPLE_MODE || import.meta.env.VITE_USE_SAMPLE || '').toLowerCase() === 'true';
export const USE_SAMPLE_MODE = Boolean(import.meta.env.DEV) && SAMPLE_MODE_FLAG;

export class ApiError extends Error {
  constructor(message, status, code, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function fetchJson(url, {
  timeoutMs = 8000,
  method = 'GET',
  body = null,
  headers = null
} = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const options = {
      method,
      signal: controller.signal
    };
    if (headers && typeof headers === 'object') {
      options.headers = { ...headers };
    }
    if (body !== null) {
      options.headers = {
        ...(options.headers || {}),
        'Content-Type': 'application/json'
      };
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    if (!res.ok) {
      let detail = null;
      let backendCode = null;
      try {
        const payload = await res.json();
        if (payload && typeof payload.error === 'string') {
          detail = payload.error;
        }
        if (payload && typeof payload.code === 'string' && payload.code.trim().length > 0) {
          backendCode = payload.code.trim();
        }
      } catch {
        detail = null;
      }
      throw new ApiError(`Request failed: ${res.status}`, res.status, backendCode || 'HTTP_ERROR', detail);
    }
    return res.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out', 0, 'TIMEOUT');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network request failed', 0, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export function requireApiBase() {
  if (!API_BASE && !USE_SAMPLE_MODE) {
    throw new ApiError(
      'Missing VITE_API_BASE_URL. Configure frontend env before starting game.',
      0,
      'CONFIG_ERROR'
    );
  }
}

export function normalizeRequiredField(value, fieldName) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    throw new ApiError(`${fieldName} is required`, 0, 'VALIDATION_ERROR');
  }
  return normalized;
}

export function normalizeBearerHeader(rawToken) {
  const token = String(rawToken || '').trim();
  if (!token) {
    return null;
  }
  if (/^bearer\s+/i.test(token)) {
    return token;
  }
  return `Bearer ${token}`;
}

export function normalizeLanguage(lang) {
  const etEnabled = String(import.meta.env.VITE_ENABLE_ET || '').toLowerCase() === 'true';
  const value = String(lang ?? '').trim().toLowerCase();
  if (value === 'et' && etEnabled) {
    return 'et';
  }
  return 'en';
}

export async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
