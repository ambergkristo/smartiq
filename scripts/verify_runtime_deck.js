#!/usr/bin/env node
/* eslint-disable no-console */
const API_BASE = (process.env.API_BASE_URL || 'http://localhost:8081').replace(/\/+$/, '');
const LANGUAGE = process.env.LANGUAGE || 'en';
const TOPIC = process.env.TOPIC || '';
const REQUESTS = Number.parseInt(process.env.REQUESTS || '50', 10);
const gameId = process.env.GAME_ID || (globalThis.crypto?.randomUUID?.() || `verify-${Date.now()}`);

const deprecatedSourcePattern = /(smartiq-factory|smartiq-generator-v1|smart10-generator-v1)/i;

async function main() {
  const seen = [];
  const violations = [];

  for (let i = 0; i < REQUESTS; i += 1) {
    const params = new URLSearchParams();
    params.set('language', LANGUAGE);
    params.set('gameId', gameId);
    if (TOPIC) params.set('topic', TOPIC);

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
    topic: TOPIC || 'any',
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
