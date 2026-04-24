#!/usr/bin/env node
const backendUrl = (process.env.BACKEND_URL || '').trim();
const frontendUrl = (process.env.FRONTEND_URL || '').trim();
const smokeLanguage = (process.env.SMOKE_LANGUAGE || 'en').trim().toLowerCase();
const smokeTopic = (process.env.SMOKE_TOPIC || '').trim();
const smokeGameId = (process.env.SMOKE_GAME_ID || `post-deploy-${Date.now()}`).trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithTimeout(url, init = {}) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout while requesting ${url}`)), timeoutMs);
  });
  try {
    const response = await Promise.race([fetch(url, init), timeoutPromise]);
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text
    };
  } catch (error) {
    throw new Error(`Request failed for ${url}: ${error.message}`);
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}

function parseJsonBody(response, errorMessage) {
  try {
    return response.text ? JSON.parse(response.text) : null;
  } catch {
    throw new Error(errorMessage);
  }
}

function buildNextRandomUrl(topic) {
  return (
    `${backendUrl}/api/cards/nextRandom` +
    `?language=${encodeURIComponent(smokeLanguage)}` +
    `&gameId=${encodeURIComponent(smokeGameId)}` +
    `&topic=${encodeURIComponent(topic)}`
  );
}

async function findPlayableDeck(topicEntries) {
  const candidates = [];
  if (smokeTopic) {
    candidates.push(smokeTopic);
  }
  topicEntries.forEach((entry) => {
    const topic = String(entry?.topic || '').trim();
    if (topic && !candidates.includes(topic)) {
      candidates.push(topic);
    }
  });

  assert(candidates.length > 0, 'Unable to resolve smoke-test topic');

  let lastStatus = null;
  for (const topic of candidates) {
    const deck = await fetchWithTimeout(buildNextRandomUrl(topic));
    if (deck.status === 200) {
      return { topic, deck };
    }
    lastStatus = deck.status;
  }

  throw new Error(`/api/cards/nextRandom expected 200 for at least one topic, last status ${lastStatus ?? 'unknown'}`);
}

async function createSoloGame(topic) {
  const response = await fetchWithTimeout(`${backendUrl}/api/game`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      players: ['Smoke Runner'],
      language: smokeLanguage,
      topic,
      winCondition: 30
    })
  });
  assert(response.status === 200, `/api/game expected 200, got ${response.status}`);

  const payload = parseJsonBody(response, '/api/game response must be JSON');
  const snapshot = payload?.snapshot;
  const gameId = String(snapshot?.gameId || '').trim();
  assert(gameId, 'Game create response missing snapshot.gameId');
  assert(snapshot?.apiVersion === '1' || snapshot?.apiVersion === 1, 'Game create response missing supported apiVersion');
  assert(Array.isArray(snapshot?.players) && snapshot.players.length > 0, 'Game create response missing players');
  assert(payload?.actionTokens && typeof payload.actionTokens === 'object', 'Game create response missing action tokens');

  return { gameId, snapshot };
}

async function main() {
  assert(backendUrl, 'BACKEND_URL is required');
  assert(frontendUrl, 'FRONTEND_URL is required');

  const health = await fetchWithTimeout(`${backendUrl}/health`);
  assert(health.status === 200, `/health expected 200, got ${health.status}`);

  const topics = await fetchWithTimeout(`${backendUrl}/api/topics`);
  assert(topics.status === 200, `/api/topics expected 200, got ${topics.status}`);
  const topicEntries = parseJsonBody(topics, '/api/topics response must be JSON array');
  assert(Array.isArray(topicEntries) && topicEntries.length > 0, '/api/topics returned empty list');

  const { topic: resolvedTopic, deck } = await findPlayableDeck(topicEntries);

  const card = parseJsonBody(deck, '/api/cards/nextRandom response must be JSON');
  const cardId = card?.cardId ?? card?.id;
  assert(cardId, 'Card payload missing cardId/id');
  assert(Array.isArray(card?.options) && card.options.length === 10, 'Card payload must include 10 options');

  const createdGame = await createSoloGame(resolvedTopic);
  const gameSnapshot = await fetchWithTimeout(`${backendUrl}/api/game/${encodeURIComponent(createdGame.gameId)}`);
  assert(gameSnapshot.status === 200, `/api/game/{gameId} expected 200, got ${gameSnapshot.status}`);
  const liveSnapshot = parseJsonBody(gameSnapshot, '/api/game/{gameId} response must be JSON');
  assert(String(liveSnapshot?.gameId || '') === createdGame.gameId, 'Fetched game session did not match created gameId');
  assert(liveSnapshot?.roundState?.phase, 'Fetched game session missing roundState.phase');
  assert(Array.isArray(liveSnapshot?.boardState?.pegs), 'Fetched game session missing boardState.pegs');

  const frontend = await fetchWithTimeout(frontendUrl);
  assert(frontend.status >= 200 && frontend.status < 400, `Frontend URL expected 2xx/3xx, got ${frontend.status}`);
  const contentType = (frontend.headers.get('content-type') || '').toLowerCase();
  assert(contentType.includes('text/html'), `Frontend content-type must include text/html, got ${contentType || '<empty>'}`);

  console.log(JSON.stringify({
    ok: true,
    backendUrl,
    frontendUrl,
    smokeLanguage,
    smokeTopic: resolvedTopic,
    smokeGameId,
    servedCardId: cardId,
    createdGameId: createdGame.gameId,
    createdGamePhase: createdGame.snapshot.roundState?.phase || null
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
