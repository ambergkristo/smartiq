#!/usr/bin/env node
const BASE_URL = process.env.LOAD_TEST_BASE_URL || 'http://localhost:8080';
const TOTAL_SESSIONS = Number(process.env.LOAD_TEST_SESSIONS || 500);
const TOTAL_REQUESTS = Number(process.env.LOAD_TEST_REQUESTS || 10000);
const TOPIC = process.env.LOAD_TEST_TOPIC || 'Math';
const DIFFICULTY = process.env.LOAD_TEST_DIFFICULTY || '2';
const LANG = process.env.LOAD_TEST_LANG || 'en';
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY || 50);

const sessions = Array.from({ length: TOTAL_SESSIONS }, (_, i) => `load-session-${i + 1}`);
const seenBySession = new Map();
let duplicateCount = 0;
let errorCount = 0;
let completed = 0;

function randSession() {
  return sessions[Math.floor(Math.random() * sessions.length)];
}

async function requestOne() {
  const sessionId = randSession();
  const url = `${BASE_URL}/api/cards/next?topic=${encodeURIComponent(TOPIC)}&difficulty=${encodeURIComponent(DIFFICULTY)}&sessionId=${encodeURIComponent(sessionId)}&lang=${encodeURIComponent(LANG)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      errorCount += 1;
      completed += 1;
      return;
    }

    const body = await res.json();
    const set = seenBySession.get(sessionId) || new Set();
    if (set.has(body.id)) {
      duplicateCount += 1;
    }
    set.add(body.id);
    seenBySession.set(sessionId, set);
  } catch (_err) {
    errorCount += 1;
  } finally {
    completed += 1;
  }
}

async function run() {
  const workers = [];
  let dispatched = 0;

  async function worker() {
    while (dispatched < TOTAL_REQUESTS) {
      dispatched += 1;
      await requestOne();
    }
  }

  for (let i = 0; i < CONCURRENCY; i += 1) {
    workers.push(worker());
  }

  await Promise.all(workers);

  const result = {
    totalRequests: TOTAL_REQUESTS,
    completed,
    totalSessions: TOTAL_SESSIONS,
    duplicateCount,
    errorCount,
    ok: duplicateCount === 0 && errorCount === 0
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

run();