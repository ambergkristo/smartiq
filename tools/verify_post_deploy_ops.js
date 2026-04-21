#!/usr/bin/env node
const backendUrl = (process.env.BACKEND_URL || '').trim();
const internalApiKey = (process.env.SMARTIQ_INTERNAL_API_KEY || process.env.INTERNAL_API_KEY || '').trim();
const internalHeaderName = (process.env.SMARTIQ_INTERNAL_API_KEY_HEADER || 'X-Internal-Api-Key').trim();
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithTimeout(url, { headers } = {}) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout while requesting ${url}`)), timeoutMs);
  });
  try {
    const response = await Promise.race([fetch(url, { headers }), timeoutPromise]);
    const text = await response.text();
    return {
      status: response.status,
      headers: response.headers,
      text
    };
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId);
    }
  }
}

function parseJson(response, label) {
  try {
    return response.text ? JSON.parse(response.text) : null;
  } catch {
    throw new Error(`${label} response must be JSON`);
  }
}

async function main() {
  assert(backendUrl, 'BACKEND_URL is required');

  const version = await fetchWithTimeout(`${backendUrl}/version`);
  assert(version.status === 200, `/version expected 200, got ${version.status}`);
  const versionPayload = parseJson(version, '/version');
  assert(String(versionPayload?.commitSha || '').trim(), '/version missing commitSha');
  assert(String(versionPayload?.buildTime || '').trim(), '/version missing buildTime');

  const internalUnauthorized = await fetchWithTimeout(`${backendUrl}/internal/pool-stats`);
  assert(internalUnauthorized.status === 401, `/internal/pool-stats expected 401 without key, got ${internalUnauthorized.status}`);

  const prometheusUnauthorized = await fetchWithTimeout(`${backendUrl}/actuator/prometheus`);
  assert(prometheusUnauthorized.status === 401, `/actuator/prometheus expected 401 without key, got ${prometheusUnauthorized.status}`);

  const result = {
    ok: true,
    backendUrl,
    commitSha: versionPayload.commitSha,
    buildTime: versionPayload.buildTime,
    internalUnauthorized: internalUnauthorized.status,
    prometheusUnauthorized: prometheusUnauthorized.status
  };

  if (internalApiKey) {
    const headers = { [internalHeaderName]: internalApiKey };
    const internalAuthorized = await fetchWithTimeout(`${backendUrl}/internal/pool-stats`, { headers });
    assert(internalAuthorized.status === 200, `/internal/pool-stats expected 200 with key, got ${internalAuthorized.status}`);
    parseJson(internalAuthorized, '/internal/pool-stats');

    const prometheusAuthorized = await fetchWithTimeout(`${backendUrl}/actuator/prometheus`, { headers });
    assert(prometheusAuthorized.status === 200, `/actuator/prometheus expected 200 with key, got ${prometheusAuthorized.status}`);
    const contentType = (prometheusAuthorized.headers.get('content-type') || '').toLowerCase();
    assert(contentType.includes('text/plain'), `/actuator/prometheus content-type must include text/plain, got ${contentType || '<empty>'}`);
    assert(prometheusAuthorized.text.includes('# HELP') || prometheusAuthorized.text.includes('# TYPE'),
      '/actuator/prometheus did not return Prometheus exposition text');

    result.internalAuthorized = internalAuthorized.status;
    result.prometheusAuthorized = prometheusAuthorized.status;
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
