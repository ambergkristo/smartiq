#!/usr/bin/env node

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function main() {
  const isVercelBuild = String(process.env.VERCEL || '').trim() === '1';
  if (!isVercelBuild) {
    return;
  }

  const rawBaseUrl = String(process.env.VITE_API_BASE_URL || '').trim();
  if (!rawBaseUrl) {
    fail('Vercel build blocked: set VITE_API_BASE_URL to the deployed backend origin (example: https://smartiq-backend.onrender.com).');
  }

  let parsed;
  try {
    parsed = new URL(rawBaseUrl);
  } catch (error) {
    fail(`Vercel build blocked: VITE_API_BASE_URL must be a valid URL. Received: ${rawBaseUrl}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    fail(`Vercel build blocked: VITE_API_BASE_URL must use http or https. Received protocol: ${parsed.protocol}`);
  }

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    fail(`Vercel build blocked: VITE_API_BASE_URL cannot point to localhost. Received: ${rawBaseUrl}`);
  }
}

main();
