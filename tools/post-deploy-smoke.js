#!/usr/bin/env node
const backendUrl = (process.env.BACKEND_URL || '').trim();
const frontendUrl = (process.env.FRONTEND_URL || '').trim();
const smokeLanguage = (process.env.SMOKE_LANGUAGE || 'en').trim().toLowerCase();
const smokeGameId = (process.env.SMOKE_GAME_ID || `post-deploy-${Date.now()}`).trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timeout while requesting ${url}`);
    }
    throw new Error(`Request failed for ${url}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  assert(backendUrl, 'BACKEND_URL is required');
  assert(frontendUrl, 'FRONTEND_URL is required');

  const health = await fetchWithTimeout(`${backendUrl}/health`);
  assert(health.status === 200, `/health expected 200, got ${health.status}`);

  const nextRandomUrl =
    `${backendUrl}/api/cards/nextRandom` +
    `?language=${encodeURIComponent(smokeLanguage)}` +
    `&gameId=${encodeURIComponent(smokeGameId)}`;
  const deck = await fetchWithTimeout(nextRandomUrl);
  assert(deck.status === 200, `/api/cards/nextRandom expected 200, got ${deck.status}`);

  let card = null;
  try {
    card = deck.text ? JSON.parse(deck.text) : null;
  } catch {
    throw new Error('/api/cards/nextRandom response must be JSON');
  }
  const cardId = card?.cardId ?? card?.id;
  assert(cardId, 'Card payload missing cardId/id');
  assert(Array.isArray(card?.options) && card.options.length === 10, 'Card payload must include 10 options');

  const frontend = await fetchWithTimeout(frontendUrl);
  assert(frontend.status >= 200 && frontend.status < 400, `Frontend URL expected 2xx/3xx, got ${frontend.status}`);
  const contentType = (frontend.headers.get('content-type') || '').toLowerCase();
  assert(contentType.includes('text/html'), `Frontend content-type must include text/html, got ${contentType || '<empty>'}`);

  console.log(JSON.stringify({
    ok: true,
    backendUrl,
    frontendUrl,
    smokeLanguage,
    smokeGameId,
    servedCardId: cardId
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
