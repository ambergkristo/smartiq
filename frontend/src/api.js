export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();
export const USE_SAMPLE_MODE = String(import.meta.env.VITE_USE_SAMPLE || '').toLowerCase() === 'true';

class ApiError extends Error {
  constructor(message, status, code, detail = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

const SAMPLE_TOPICS = [
  { topic: 'Science', count: 120 },
  { topic: 'History', count: 120 },
  { topic: 'Math', count: 120 }
];

function sampleCard({ topic, difficulty, language }) {
  const normalizedTopic = topic || 'Science';
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const normalizedLanguage = normalizeLanguage(language);
  return {
    id: `sample-${normalizedTopic.toLowerCase()}-${normalizedDifficulty}`,
    cardId: `sample-${normalizedTopic.toLowerCase()}-${normalizedDifficulty}`,
    topic: normalizedTopic,
    subtopic: 'SAMPLE',
    language: normalizedLanguage,
    question: `${normalizedTopic} sample question (${normalizedLanguage.toUpperCase()})`,
    options: Array.from({ length: 10 }, (_, index) => `${normalizedTopic} option ${index + 1}`),
    category: 'OPEN',
    correct: { correctIndex: 0 },
    difficulty: String(normalizedDifficulty),
    source: 'sample-mode',
    createdAt: new Date().toISOString()
  };
}

function normalizeCardPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const options = Array.isArray(raw.options)
    ? raw.options.map((entry) => (entry && typeof entry === 'object' && 'text' in entry ? entry.text : String(entry)))
    : [];

  let correct = raw.correct;
  if (!correct || typeof correct !== 'object') {
    if (Array.isArray(raw.correctIndexes)) {
      correct = { correctIndexes: raw.correctIndexes };
    } else if (Number.isInteger(raw.correctIndex)) {
      correct = { correctIndex: raw.correctIndex };
    } else {
      correct = {};
    }
  }

  return {
    ...raw,
    id: raw.id || raw.cardId,
    cardId: raw.cardId || raw.id,
    category: raw.category || raw.subtopic || 'OPEN',
    options,
    correct
  };
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
      let detail = null;
      try {
        const payload = await res.json();
        if (payload && typeof payload.error === 'string') {
          detail = payload.error;
        }
      } catch {
        detail = null;
      }
      throw new ApiError(`Request failed: ${res.status}`, res.status, 'HTTP_ERROR', detail);
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

function requireApiBase() {
  if (!API_BASE && !USE_SAMPLE_MODE) {
    throw new ApiError(
      'Missing VITE_API_BASE_URL. Configure frontend env before starting game.',
      0,
      'CONFIG_ERROR'
    );
  }
}

function normalizeDifficulty(difficulty) {
  const value = String(difficulty ?? '').trim().toLowerCase();
  if (value === 'easy') return 1;
  if (value === 'medium') return 2;
  if (value === 'hard') return 3;
  if (value === '1' || value === '2' || value === '3') return Number(value);
  return 1;
}

function normalizeLanguage(lang) {
  const value = String(lang ?? '').trim().toLowerCase();
  return value === 'et' ? 'et' : 'en';
}

export function buildNextCardQuery({ topic, difficulty, language }) {
  const params = new URLSearchParams();
  if (topic) {
    params.set('topic', String(topic));
  }
  params.set('difficulty', String(normalizeDifficulty(difficulty)));
  const normalizedLanguage = normalizeLanguage(language);
  params.set('language', normalizedLanguage);
  params.set('lang', normalizedLanguage);
  return params;
}

export async function fetchTopics() {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return SAMPLE_TOPICS;
  }
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

  if (error?.code === 'CONFIG_ERROR') {
    return {
      title: 'Frontend API is not configured.',
      detail: 'Set VITE_API_BASE_URL (example: http://localhost:8081).',
      kind: 'config-error'
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
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return normalizeCardPayload(sampleCard({
      topic,
      difficulty: normalizeDifficulty(difficulty),
      language: normalizeLanguage(lang)
    }));
  }

  const gameId = sessionId || 'local-dev';
  const params = new URLSearchParams();
  params.set('language', normalizeLanguage(lang));
  params.set('gameId', gameId);
  if (topic) {
    params.set('topic', String(topic));
  }
  const url = `${API_BASE}/api/cards/nextRandom?${params.toString()}`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const card = await fetchJson(url);
      return normalizeCardPayload(card);
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

export async function fetchNextRandomCard({ language, gameId, topic, retries = 2 }) {
  return fetchNextCard({
    topic,
    sessionId: gameId,
    lang: language,
    retries
  });
}

export function resolveCardErrorMessage(error) {
  if (error?.code === 'CONFIG_ERROR') {
    return 'Frontend API is not configured. Set VITE_API_BASE_URL and retry.';
  }

  if (error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR') {
    return 'Backend unreachable. Check API availability and retry.';
  }

  if (error?.status === 401 || error?.status === 403) {
    return 'Forbidden (CORS/security). Check dev env / CORS origins.';
  }

  if (error?.status === 404) {
    if (typeof error?.detail === 'string' && error.detail.trim().length > 0) {
      return `Not found. ${error.detail}`;
    }
    return 'Not found. Question bank is empty for this filter.';
  }

  if (error?.status === 409) {
    return 'Conflict (slot/card unavailable). Please retry.';
  }

  if (error?.status >= 500) {
    return 'Server error. Retry to continue.';
  }

  return 'Could not load card from backend. Retry to continue.';
}
