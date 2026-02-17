#!/usr/bin/env node
const requiredFrontend = ['VITE_API_BASE_URL'];
const requiredBackend = [
  'SPRING_PROFILES_ACTIVE',
  'SPRING_DATASOURCE_URL',
  'SPRING_DATASOURCE_USERNAME',
  'SPRING_DATASOURCE_PASSWORD',
  'SMARTIQ_CORS_ALLOWED_ORIGIN_PUBLIC',
  'SMARTIQ_INTERNAL_API_KEY'
];

function missing(vars) {
  return vars.filter((v) => !(process.env[v] || '').trim());
}

function main() {
  const missingFrontend = missing(requiredFrontend);
  const missingBackend = missing(requiredBackend);

  const result = {
    frontendMissing: missingFrontend,
    backendMissing: missingBackend,
    ok: missingFrontend.length === 0 && missingBackend.length === 0
  };

  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }
}

main();
