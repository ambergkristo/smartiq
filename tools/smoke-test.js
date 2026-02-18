#!/usr/bin/env node
const baseUrl = (process.env.BACKEND_URL || '').trim();
const RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 1500;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, json, text };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout while requesting ${url}`);
    }
    throw new Error(`Request failed for ${url}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
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
      if (response.status >= 500 && attempt < RETRY_ATTEMPTS) {
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
  const required = ['id', 'topic', 'language', 'question', 'options', 'difficulty', 'source', 'createdAt'];
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

  const health = await getJsonWithRetry(`${baseUrl}/health`);
  assert(health.status === 200, describeResponse('/health expected 200', health));

  const topics = await getJsonWithRetry(`${baseUrl}/api/topics`);
  assert(topics.status === 200, describeResponse('/api/topics expected 200', topics));
  assert(Array.isArray(topics.json), '/api/topics must return array');

  const card = await getJsonWithRetry(`${baseUrl}/api/cards/next?topic=Math&difficulty=2&sessionId=smoke&lang=en`);
  assert(card.status === 200, describeResponse('/api/cards/next expected 200', card));
  validateCard(card.json);

  console.log(JSON.stringify({ ok: true, baseUrl }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
