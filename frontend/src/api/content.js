import {
  API_BASE,
  ApiError,
  USE_SAMPLE_MODE,
  delay,
  fetchJson,
  normalizeLanguage,
  requireApiBase
} from './core';

const SAMPLE_TOPICS = [
  { topic: 'Science', count: 120 },
  { topic: 'History', count: 120 },
  { topic: 'Math', count: 120 }
];

function sampleCard({ topic, language }) {
  const normalizedTopic = topic || 'Science';
  const normalizedLanguage = normalizeLanguage(language);
  return {
    id: `sample-${normalizedTopic.toLowerCase()}`,
    cardId: `sample-${normalizedTopic.toLowerCase()}`,
    topic: normalizedTopic,
    subtopic: 'SAMPLE',
    language: normalizedLanguage,
    question: `${normalizedTopic} sample question (${normalizedLanguage.toUpperCase()})`,
    options: Array.from({ length: 8 }, (_, index) => `${normalizedTopic} option ${index + 1}`),
    category: 'OPEN',
    correct: { correctIndex: 0 },
    difficulty: '1',
    source: 'sample-mode',
    createdAt: new Date().toISOString()
  };
}

function normalizeCardPayload(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  const options = Array.isArray(raw.options)
    ? raw.options.map((entry) => (entry && typeof entry === 'object' && 'text' in entry ? entry.text : String(entry)))
    : Array.isArray(raw.answers)
      ? raw.answers.map((entry) => String(entry))
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
    questionText: raw.questionText || raw.question || '',
    category: raw.category || raw.subtopic || 'OPEN',
    options,
    answers: options,
    correctAnswerIndex: Number.isInteger(raw.correctAnswerIndex)
      ? raw.correctAnswerIndex
      : Number.isInteger(correct?.correctIndex)
        ? correct.correctIndex
        : null,
    correct
  };
}

const TOPICS_WARMUP_DELAYS_MS = [5000, 10000, 20000];

function isBackendWarmupCandidate(error) {
  return error?.code === 'TIMEOUT' || error?.code === 'NETWORK_ERROR';
}

async function fetchBackendHealth() {
  return fetchJson(`${API_BASE}/health`);
}

export async function fetchTopics({ onWarmupChange } = {}) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return SAMPLE_TOPICS;
  }

  const topicsUrl = `${API_BASE}/api/topics`;

  try {
    return await fetchJson(topicsUrl);
  } catch (error) {
    if (!isBackendWarmupCandidate(error)) {
      throw error;
    }

    let lastError = error;
    for (let attempt = 0; attempt < TOPICS_WARMUP_DELAYS_MS.length; attempt += 1) {
      const delayMs = TOPICS_WARMUP_DELAYS_MS[attempt];
      onWarmupChange?.({
        attempt: attempt + 1,
        totalAttempts: TOPICS_WARMUP_DELAYS_MS.length,
        nextDelayMs: delayMs
      });

      try {
        await fetchBackendHealth();
        return await fetchJson(topicsUrl);
      } catch (retryError) {
        lastError = retryError;
        if (!isBackendWarmupCandidate(retryError)) {
          throw retryError;
        }
        if (attempt < TOPICS_WARMUP_DELAYS_MS.length - 1) {
          await delay(delayMs);
        }
      }
    }

    throw new ApiError(
      lastError?.message || 'Backend unavailable after warm-up retries',
      0,
      'WARMUP_FAILED'
    );
  }
}

export function resolveTopicsErrorState(error) {
  if (error?.code === 'CONTENT_UNHEALTHY') {
    return {
      title: 'CherryPick content failed to load. Please check runtime dataset configuration.',
      detail: typeof error?.detail === 'string' && error.detail.trim().length > 0
        ? error.detail
        : 'Backend reported missing or broken CherryPick runtime content.',
      kind: 'content-unhealthy'
    };
  }

  if (error?.code === 'WARMUP_FAILED') {
    return {
      title: 'Backend unavailable.',
      detail: 'Backend did not wake up after multiple attempts. Retry in a moment.',
      kind: 'backend-unreachable'
    };
  }

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

export async function fetchNextCard({ topic, gameId, language, retries = 2 }) {
  requireApiBase();
  if (USE_SAMPLE_MODE) {
    return normalizeCardPayload(sampleCard({
      topic,
      language: normalizeLanguage(language)
    }));
  }

  const resolvedGameId = String(gameId || '').trim() || 'local-dev';
  const params = new URLSearchParams();
  params.set('language', normalizeLanguage(language));
  params.set('gameId', resolvedGameId);
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
      if (/^No cards available for language=/i.test(error.detail.trim())) {
        return `No playable cards for this filter. ${error.detail}. Change topic/language or import cards.`;
      }
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
