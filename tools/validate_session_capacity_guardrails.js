#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const configPathArg = process.argv[2] || 'backend/src/main/resources/application-prod.yml';
const configPath = path.resolve(process.cwd(), configPathArg);

const guardrails = [
  {
    envVar: 'SMARTIQ_GAME_SESSION_RETENTION_MINUTES',
    minFallback: 120,
    description: 'game session retention minutes'
  },
  {
    envVar: 'SMARTIQ_GAME_SESSION_MAX',
    minFallback: 20000,
    description: 'game session max'
  },
  {
    envVar: 'SMARTIQ_ROOM_RETENTION_MINUTES',
    minFallback: 120,
    description: 'room retention minutes'
  },
  {
    envVar: 'SMARTIQ_ROOM_MAX',
    minFallback: 10000,
    description: 'room max'
  }
];

function fallbackFor(content, envVar) {
  const pattern = new RegExp(`\\$\\{${envVar}:([0-9]+)\\}`);
  const match = content.match(pattern);
  if (!match) {
    return null;
  }
  const value = Number.parseInt(match[1], 10);
  return Number.isFinite(value) ? value : null;
}

function main() {
  if (!fs.existsSync(configPath)) {
    console.error(`Missing config file: ${configPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const issues = [];
  const values = {};

  for (const guardrail of guardrails) {
    const fallback = fallbackFor(content, guardrail.envVar);
    if (fallback == null) {
      issues.push(`Missing ${guardrail.envVar} fallback in ${configPathArg}`);
      continue;
    }
    values[guardrail.envVar] = fallback;
    if (fallback < guardrail.minFallback) {
      issues.push(
        `${guardrail.envVar} fallback (${fallback}) is below minimum `
        + `${guardrail.minFallback} for ${guardrail.description}`
      );
    }
  }

  const gameMax = values.SMARTIQ_GAME_SESSION_MAX;
  const roomMax = values.SMARTIQ_ROOM_MAX;
  if (Number.isFinite(gameMax) && Number.isFinite(roomMax) && gameMax < roomMax) {
    issues.push(
      `SMARTIQ_GAME_SESSION_MAX (${gameMax}) must be >= SMARTIQ_ROOM_MAX (${roomMax})`
    );
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(issue);
    }
    process.exit(1);
  }

  const summary = {
    ok: true,
    configPath: configPathArg.replace(/\\/g, '/'),
    guardrails: values
  };

  console.log(JSON.stringify(summary, null, 2));
  console.log('\nSession capacity guardrail validation passed.');
}

main();
