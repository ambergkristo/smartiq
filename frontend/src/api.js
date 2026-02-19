export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8080';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function delay(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new ApiError(`Request failed: ${res.status}`, res.status, 'HTTP_ERROR');
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

export async function fetchTopics() {
  return fetchJson(`${API_BASE}/api/topics`);
}

export function resolveTopicsErrorState(error) {
  if (error?.code === 'TIMEOUT') {
    return {
      title: 'Backend request timed out.',
      detail: 'Check if backend is running, then retry.',
      kind: 'backend-unreachable'
    };
  }

  if (error?.code === 'NETWORK_ERROR') {
    return {
      title: 'Backend is unreachable.',
      detail: 'Verify backend URL and that the API server is running.',
      kind: 'backend-unreachable'
    };
  }

  if (error?.status === 401 || error?.status === 403) {
    return {
      title: 'Forbidden (CORS/security).',
      detail: 'Check dev env / CORS origins.',
      kind: 'forbidden'
    };
  }

  if (error?.status === 404) {
    return {
      title: 'Not found.',
      detail: 'Topics endpoint is missing or routed incorrectly.',
      kind: 'not-found'
    };
  }

  if (error?.status >= 500) {
    return {
      title: 'Server error.',
      detail: 'Backend responded with a server error. Retry in a moment.',
      kind: 'server-error'
    };
  }

  return {
    title: 'Could not load topics.',
    detail: 'Unexpected response. Retry and inspect backend logs.',
    kind: 'backend-unreachable'
  };
}

function isRetryable(error) {
  if (!(error instanceof ApiError)) {
    return true;
  }
  if (error.code === 'TIMEOUT' || error.code === 'NETWORK_ERROR') {
    return true;
  }
  return error.status >= 500;
}

export async function fetchNextCard({ topic, difficulty, sessionId, lang, retries = 2 }) {
  const params = new URLSearchParams();
  if (topic) params.set('topic', topic);
  if (difficulty) params.set('difficulty', String(difficulty));
  if (sessionId) params.set('sessionId', sessionId);
  if (lang) params.set('lang', lang);

  const url = `${API_BASE}/api/cards/next?${params.toString()}`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fetchJson(url);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error) || attempt === retries) {
        throw error;
      }
      await delay(250 * (attempt + 1));
    }
  }

  throw lastError;
}

export function resolveCardErrorMessage(error) {
  if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
    return 'Backend unreachable. Check API availability and retry.';
  }

  if (error?.status === 401 || error?.status === 403) {
    return 'Forbidden (CORS/security). Check dev env / CORS origins.';
  }

  if (error?.status === 404) {
    return 'Not found. Question bank is empty for this filter.';
  }

  if (error?.status === 409) {
    return 'Conflict (slot/card unavailable). Please retry.';
  }

  if (error?.status >= 500) {
    return 'Server error. Retry to continue.';
  }

  return 'Fallback mode: backend is unavailable right now. Retry to continue.';
}
