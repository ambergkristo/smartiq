#!/usr/bin/env node
/* eslint-disable no-console */
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');
const LANGUAGE = process.env.LANGUAGE || 'en';
const TOPIC = process.env.TOPIC || '';
const REQUESTS = Number.parseInt(process.env.REQUESTS || '50', 10);
const gameId = process.env.GAME_ID || (globalThis.crypto?.randomUUID?.() || `verify-${Date.now()}`);

const deprecatedSourcePattern = /(smartiq-factory|smartiq-generator-v1|smart10-generator-v1)/i;

async function resolveTopic() {
  if (TOPIC) {
    return TOPIC;
  }

  const response = await fetch(`${API_BASE}/api/topics`);
  if (!response.ok) {
    throw new Error(`/api/topics expected 200, got ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new Error('/api/topics returned empty list');
  }

  const candidate = payload.find((entry) => typeof entry?.topic === 'string' && entry.topic.trim());
  if (!candidate?.topic) {
    throw new Error('Unable to resolve runtime deck topic');
  }

  const candidates = payload
    .map((entry) => String(entry?.topic || '').trim())
    .filter(Boolean);

  for (const topic of candidates) {
    const params = new URLSearchParams();
    params.set('language', LANGUAGE);
    params.set('gameId', `${gameId}-probe`);
    params.set('topic', topic);

    const probeResponse = await fetch(`${API_BASE}/api/cards/nextRandom?${params.toString()}`);
    if (probeResponse.ok) {
      return topic;
    }
  }

  throw new Error('Unable to resolve playable runtime deck topic');
}

async function main() {
  const resolvedTopic = await resolveTopic();
  const seen = [];
  const violations = [];

  for (let i = 0; i < REQUESTS; i += 1) {
    const params = new URLSearchParams();
    params.set('language', LANGUAGE);
    params.set('gameId', gameId);
    params.set('topic', resolvedTopic);

    const url = `${API_BASE}/api/cards/nextRandom?${params.toString()}`;
    const response = await fetch(url);
    if (!response.ok) {
      const payload = await response.text();
      violations.push(`request ${i + 1}: http ${response.status} body=${payload}`);
      break;
    }

    const card = await response.json();
    seen.push(card);
    const source = String(card.source || '');
    if (deprecatedSourcePattern.test(source)) {
      violations.push(`request ${i + 1}: deprecated source served (${source}) cardId=${card.cardId || card.id}`);
    }

    if (i > 0) {
      const prev = seen[i - 1];
      if (card.category && prev.category && card.category === prev.category) {
        violations.push(`request ${i + 1}: immediate category repeat ${card.category}`);
      }
      if (card.topic && prev.topic && card.topic === prev.topic) {
        violations.push(`request ${i + 1}: immediate topic repeat ${card.topic}`);
      }
    }
  }

  const report = {
    apiBase: API_BASE,
    language: LANGUAGE,
    topic: resolvedTopic,
    requestsAttempted: seen.length,
    gameId,
    uniqueCards: new Set(seen.map((card) => card.cardId || card.id)).size,
    violations
  };

  console.log(JSON.stringify(report, null, 2));
  if (violations.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
