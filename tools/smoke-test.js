#!/usr/bin/env node
const baseUrl = (process.env.BACKEND_URL || '').trim();

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getJson(url) {
  const res = await fetch(url);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: res.status, json, text };
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

  const health = await getJson(`${baseUrl}/health`);
  assert(health.status === 200, `/health expected 200 got ${health.status}`);

  const topics = await getJson(`${baseUrl}/api/topics`);
  assert(topics.status === 200, `/api/topics expected 200 got ${topics.status}`);
  assert(Array.isArray(topics.json), '/api/topics must return array');

  const card = await getJson(`${baseUrl}/api/cards/next?topic=Math&difficulty=2&sessionId=smoke&lang=en`);
  assert(card.status === 200, `/api/cards/next expected 200 got ${card.status}`);
  validateCard(card.json);

  console.log(JSON.stringify({ ok: true, baseUrl }, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});