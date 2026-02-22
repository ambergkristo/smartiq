#!/usr/bin/env node
/* eslint-disable no-console */

const API_BASE = (process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:8081').replace(/\/+$/, '');
const LANGUAGE = process.env.LANGUAGE || 'en';
const TOPIC = process.env.TOPIC || '';
const DRAWS = Math.max(1, Math.min(200, Number.parseInt(process.env.REQUESTS || process.env.DRAWS || '80', 10)));
const GAME_ID = process.env.GAME_ID || (globalThis.crypto?.randomUUID?.() || `runtime-health-${Date.now()}`);
const POOL_LOW_WATERMARK = Math.max(1, Math.min(500, Number.parseInt(process.env.POOL_LOW_WATERMARK || '20', 10)));

function parsePrometheusMetrics(text) {
  const lines = text.split('\n');
  const metrics = new Map();

  for (const line of lines) {
    if (!line || line.startsWith('#')) {
      continue;
    }

    const metricMatch = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+([0-9eE.+-]+)$/);
    if (!metricMatch) {
      continue;
    }

    const name = metricMatch[1];
    const labelRaw = metricMatch[2] || '';
    const value = Number.parseFloat(metricMatch[3]);
    const key = `${name}${labelRaw}`;
    if (!Number.isFinite(value)) {
      continue;
    }
    metrics.set(key, value);
  }

  return metrics;
}

function metricDiff(beforeMap, afterMap, metricPrefix) {
  const diff = {};
  for (const [key, afterValue] of afterMap.entries()) {
    if (!key.startsWith(metricPrefix)) {
      continue;
    }
    const beforeValue = beforeMap.get(key) ?? 0;
    const delta = afterValue - beforeValue;
    if (delta > 0) {
      diff[key] = delta;
    }
  }
  return diff;
}

function extractTagValue(metricKey, tagName) {
  const match = metricKey.match(/\{([^}]*)\}/);
  if (!match) return null;
  const labels = match[1].split(',');
  for (const label of labels) {
    const [name, rawValue] = label.split('=');
    if (name === tagName && rawValue) {
      return rawValue.replace(/^"/, '').replace(/"$/, '');
    }
  }
  return null;
}

async function fetchPrometheusSnapshot() {
  const response = await fetch(`${API_BASE}/actuator/prometheus`);
  if (!response.ok) {
    throw new Error(`prometheus_http_${response.status}`);
  }
  const body = await response.text();
  return parsePrometheusMetrics(body);
}

async function fetchPoolStats() {
  const response = await fetch(`${API_BASE}/internal/pool-stats`);
  if (!response.ok) {
    throw new Error(`pool_stats_http_${response.status}`);
  }
  return response.json();
}

async function drawCard() {
  const params = new URLSearchParams();
  params.set('language', LANGUAGE);
  params.set('gameId', GAME_ID);
  if (TOPIC) {
    params.set('topic', TOPIC);
  }

  const response = await fetch(`${API_BASE}/api/cards/nextRandom?${params.toString()}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`draw_http_${response.status}:${body}`);
  }
  return response.json();
}

async function main() {
  let beforeMetrics = new Map();
  let afterMetrics = new Map();
  let prometheusAvailable = true;
  let poolStatsAvailable = true;

  try {
    beforeMetrics = await fetchPrometheusSnapshot();
  } catch {
    prometheusAvailable = false;
  }

  const seen = [];
  const sourceCounts = {};
  const repeatCounts = { category: 0, topic: 0, cardId: 0 };

  for (let i = 0; i < DRAWS; i += 1) {
    const card = await drawCard();
    seen.push(card);
    const source = String(card.source || 'unknown');
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    if (i > 0) {
      const prev = seen[i - 1];
      if (card.category && prev.category && card.category === prev.category) {
        repeatCounts.category += 1;
      }
      if (card.topic && prev.topic && card.topic === prev.topic) {
        repeatCounts.topic += 1;
      }
      const currentId = card.cardId || card.id;
      const prevId = prev.cardId || prev.id;
      if (currentId && prevId && currentId === prevId) {
        repeatCounts.cardId += 1;
      }
    }
  }

  if (prometheusAvailable) {
    try {
      afterMetrics = await fetchPrometheusSnapshot();
    } catch {
      prometheusAvailable = false;
    }
  }

  let poolStats = [];
  if (poolStatsAvailable) {
    try {
      poolStats = await fetchPoolStats();
    } catch {
      poolStatsAvailable = false;
    }
  }

  const comparisons = Math.max(0, seen.length - 1);
  const repeatRates = {
    category: comparisons === 0 ? 0 : repeatCounts.category / comparisons,
    topic: comparisons === 0 ? 0 : repeatCounts.topic / comparisons,
    cardId: comparisons === 0 ? 0 : repeatCounts.cardId / comparisons
  };

  let relaxLevelUsage = { unavailable: true };
  if (prometheusAvailable) {
    const relaxDiff = metricDiff(beforeMetrics, afterMetrics, 'smartiq_next_random_relax_total');
    const relaxCounts = {};
    for (const [metricKey, delta] of Object.entries(relaxDiff)) {
      const level = extractTagValue(metricKey, 'level') || 'unknown';
      relaxCounts[level] = (relaxCounts[level] || 0) + delta;
    }
    relaxLevelUsage = relaxCounts;
  }

  const poolTotals = {
    totalKeys: poolStats.length,
    emptyKeys: poolStats.filter((stat) => stat.poolSize === 0).length,
    lowKeys: poolStats.filter((stat) => stat.poolSize <= POOL_LOW_WATERMARK).length
  };

  const poolTraffic = poolStats.reduce(
    (acc, stat) => {
      acc.fallback += stat.fallbackDbHits || 0;
      acc.hits += stat.cacheHits || 0;
      acc.misses += stat.cacheMisses || 0;
      acc.cacheHitRateSum += stat.cacheHitRate || 0;
      return acc;
    },
    { fallback: 0, hits: 0, misses: 0, cacheHitRateSum: 0 }
  );

  const poolRequests = poolTraffic.fallback + poolTraffic.hits + poolTraffic.misses;
  const fallbackDbHitRate = poolRequests === 0 ? 0 : poolTraffic.fallback / poolRequests;
  const avgCacheHitRate = poolTotals.totalKeys === 0 ? 0 : poolTraffic.cacheHitRateSum / poolTotals.totalKeys;

  const lowestPools = poolStats
    .slice()
    .sort((a, b) => a.poolSize - b.poolSize)
    .slice(0, 5)
    .map((stat) => ({
      topic: stat.topic,
      difficulty: stat.difficulty,
      language: stat.language,
      poolSize: stat.poolSize,
      cacheHitRate: stat.cacheHitRate,
      fallbackDbHits: stat.fallbackDbHits,
      refillCount: stat.refillCount,
      lastRefillAt: stat.lastRefillAt
    }));

  const report = {
    apiBase: API_BASE,
    language: LANGUAGE,
    topic: TOPIC || 'any',
    draws: seen.length,
    gameId: GAME_ID,
    repeatCounts,
    repeatRates,
    sourceDistribution: sourceCounts,
    relaxLevelUsage,
    prometheusAvailable,
    deckExhaustion: {
      poolStatsAvailable,
      lowWatermark: POOL_LOW_WATERMARK,
      totalKeys: poolTotals.totalKeys,
      emptyKeys: poolTotals.emptyKeys,
      lowKeys: poolTotals.lowKeys,
      fallbackDbHitRate,
      avgCacheHitRate,
      lowestPools
    }
  };

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
