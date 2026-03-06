#!/usr/bin/env node
const baseUrl = (process.env.BACKEND_URL || '').trim();
const requestedLanguage = (process.env.SMOKE_LANGUAGE || 'en').trim().toLowerCase();
const requestedTopic = (process.env.SMOKE_TOPIC || '').trim();
const requestedGameId = (process.env.SMOKE_GAME_ID || '').trim();
const RETRY_ATTEMPTS = parseIntEnv('SMOKE_RETRY_ATTEMPTS', 5, 1, 120);
const RETRY_DELAY_MS = parseIntEnv('SMOKE_RETRY_DELAY_MS', 1500, 0, 60000);
const REQUEST_TIMEOUT_MS = parseIntEnv('SMOKE_REQUEST_TIMEOUT_MS', 8000, 1000, 120000);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseIntEnv(name, fallback, min, max) {
  const raw = (process.env[name] || '').trim();
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetryStatus(statusCode) {
  return statusCode >= 500 || statusCode === 408 || statusCode === 425 || statusCode === 429;
}

async function fetchWithTimeout(url, timeoutMs) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout while requesting ${url}`)), timeoutMs);
  });
  try {
    return await Promise.race([
      fetch(url),
      timeoutPromise
    ]);
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}

async function getJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text };
  } catch (error) {
    if ((error?.message || '').startsWith('Timeout while requesting')) {
      throw error;
    }
    throw new Error(`Request failed for ${url}: ${error.message}`);
  }
}

function describeResponse(prefix, response) {
  const body = response.text ? response.text.slice(0, 300) : '<empty>';
  return `${prefix} (status=${response.status}, body=${body})`;
}

async function getJsonWithRetry(url) {
  let lastResponse = null;
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt += 1) {
    try {
      const response = await getJson(url);
      if (shouldRetryStatus(response.status) && attempt < RETRY_ATTEMPTS) {
        await delay(RETRY_DELAY_MS);
        lastResponse = response;
        continue;
      }
      return response;
    } catch (error) {
      if (attempt === RETRY_ATTEMPTS) {
        throw error;
      }
      await delay(RETRY_DELAY_MS);
    }
  }
  return lastResponse;
}

function validateCard(card) {
  assert(card && typeof card === 'object', 'Card payload must be an object');
  const cardId = card.cardId ?? card.id;
  assert(cardId !== undefined && cardId !== null, 'Card missing field: cardId');
  const required = ['topic', 'language', 'question', 'options'];
  for (const key of required) {
    assert(card[key] !== undefined && card[key] !== null, `Card missing field: ${key}`);
  }
  assert(Array.isArray(card.options), 'Card options must be array');
  assert(card.options.length === 10, 'Card options must have length 10');
}

async function main() {
  if (!baseUrl) {
    throw new Error('BACKEND_URL is required. Example: BACKEND_URL=https://smartiq-backend.onrender.com');
  }
  if (!requestedLanguage) {
    throw new Error('SMOKE_LANGUAGE must be a non-empty locale code (example: en, et)');
  }

  const health = await getJsonWithRetry(`${baseUrl}/health`);
  assert(health.status === 200, describeResponse('/health expected 200', health));

  const topics = await getJsonWithRetry(`${baseUrl}/api/topics`);
  assert(topics.status === 200, describeResponse('/api/topics expected 200', topics));
  assert(Array.isArray(topics.json), '/api/topics must return array');
  assert(topics.json.length > 0, '/api/topics returned empty list');

  const preferredTopic = requestedTopic
    ? topics.json.find((entry) => entry?.topic === requestedTopic)
    : topics.json.find((entry) => entry?.topic === 'Math');
  const topic = preferredTopic?.topic || requestedTopic || topics.json[0]?.topic;
  assert(typeof topic === 'string' && topic.length > 0, 'Unable to resolve smoke-test topic');
  const gameId = requestedGameId || `smoke-${requestedLanguage}-${Date.now()}`;

  const cardUrl =
    `${baseUrl}/api/cards/nextRandom` +
    `?language=${encodeURIComponent(requestedLanguage)}&gameId=${encodeURIComponent(gameId)}` +
    `&topic=${encodeURIComponent(topic)}`;
  const card = await getJsonWithRetry(cardUrl);
  assert(card.status === 200, describeResponse('/api/cards/nextRandom expected 200', card));
  validateCard(card.json);

  console.log(JSON.stringify({ ok: true, baseUrl, topic, gameId, requestedLanguage, servedLanguage: card.json.language }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
