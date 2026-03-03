#!/usr/bin/env node
const requiredFrontend = ['VITE_API_BASE_URL'];
const requiredBackend = [
  'SPRING_PROFILES_ACTIVE',
  'SPRING_DATASOURCE_URL',
  'SPRING_DATASOURCE_USERNAME',
  'SPRING_DATASOURCE_PASSWORD',
  'SMARTIQ_INTERNAL_API_KEY'
];

function hasText(value) {
  return Boolean(String(value || '').trim());
}

function missing(vars) {
  return vars.filter((name) => !hasText(process.env[name]));
}

function parseUrl(name, value, errors) {
  try {
    return new URL(value);
  } catch (error) {
    errors.push(`${name} must be a valid absolute URL. Received: ${value}`);
    return null;
  }
}

function main() {
  const missingFrontend = missing(requiredFrontend);
  const missingBackend = missing(requiredBackend);
  const errors = [];

  const corsFromApp = String(process.env.APP_CORS_ALLOWED_ORIGINS || '').trim();
  const corsFromSmartiq = String(process.env.SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC || '').trim();
  const hasCorsAllowlist = hasText(corsFromApp) || hasText(corsFromSmartiq);
  if (!hasCorsAllowlist) {
    errors.push('Configure APP_CORS_ALLOWED_ORIGINS (preferred) or SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC.');
  }

  const apiBase = String(process.env.VITE_API_BASE_URL || '').trim();
  if (hasText(apiBase)) {
    const parsed = parseUrl('VITE_API_BASE_URL', apiBase, errors);
    if (parsed && ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname.toLowerCase())) {
      errors.push(`VITE_API_BASE_URL must not point to localhost for deploys. Received: ${apiBase}`);
    }
  }

  const result = {
    frontendMissing: missingFrontend,
    backendMissing: missingBackend,
    errors,
    ok: missingFrontend.length === 0 && missingBackend.length === 0 && errors.length === 0
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main();
