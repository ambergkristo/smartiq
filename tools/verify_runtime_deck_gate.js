#!/usr/bin/env node

const { execSync, spawn } = require('node:child_process');
const path = require('node:path');

const DEFAULT_PORT = Number.parseInt(process.env.RUNTIME_DECK_BACKEND_PORT || '8081', 10);
const STARTUP_TIMEOUT_MS = Number.parseInt(process.env.RUNTIME_DECK_STARTUP_TIMEOUT_MS || '120000', 10);
const HEALTH_POLL_MS = Number.parseInt(process.env.RUNTIME_DECK_HEALTH_POLL_MS || '1500', 10);
const DATA_READY_TIMEOUT_MS = Number.parseInt(process.env.RUNTIME_DECK_DATA_READY_TIMEOUT_MS || '180000', 10);
const MIN_READY_TOPIC_CARD_COUNT = Number.parseInt(process.env.RUNTIME_DECK_MIN_TOPIC_CARD_COUNT || '1000', 10);
const MAVEN_BIN = process.platform === 'win32' ? 'mvn.cmd' : 'mvn';

const explicitApiBase = process.env.API_BASE_URL || process.env.BACKEND_URL;
const apiBaseUrl = (explicitApiBase || `http://localhost:${DEFAULT_PORT}`).replace(/\/+$/, '');

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function startBackend() {
  const backendEnv = {
    ...process.env,
    SPRING_DATASOURCE_URL: process.env.SPRING_DATASOURCE_URL || 'jdbc:h2:mem:smartiq_runtime_gate;MODE=PostgreSQL;DB_CLOSE_DELAY=-1',
    SPRING_DATASOURCE_USERNAME: process.env.SPRING_DATASOURCE_USERNAME || 'sa',
    SPRING_DATASOURCE_PASSWORD: process.env.SPRING_DATASOURCE_PASSWORD || '',
    SPRING_FLYWAY_PLACEHOLDERS_SEED_CORE_ENABLED: process.env.SPRING_FLYWAY_PLACEHOLDERS_SEED_CORE_ENABLED || 'false',
    SMARTIQ_IMPORT_ENABLED: process.env.SMARTIQ_IMPORT_ENABLED || 'true',
    SMARTIQ_IMPORT_PATH: process.env.SMARTIQ_IMPORT_PATH || path.resolve(__dirname, '..', 'data', 'smart10'),
    SMARTIQ_POOL_ENABLED: process.env.SMARTIQ_POOL_ENABLED || 'false',
    MIN_BANK_SIZE: process.env.MIN_BANK_SIZE || '1',
    SMARTIQ_MIN_CATEGORY_THRESHOLD: process.env.SMARTIQ_MIN_CATEGORY_THRESHOLD || '1'
  };

  const mavenArgs = [
    '-q',
    '-f',
    'backend/pom.xml',
    'spring-boot:run',
    `-Dspring-boot.run.arguments=--server.port=${DEFAULT_PORT}`
  ];

  const command = process.platform === 'win32' ? 'cmd.exe' : MAVEN_BIN;
  const commandArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', `${MAVEN_BIN} ${mavenArgs.join(' ')}`]
    : mavenArgs;

  const backendProcess = spawn(command, commandArgs, {
    stdio: 'inherit',
    detached: process.platform !== 'win32',
    env: backendEnv
  });
  backendProcess.on('error', (error) => {
    backendProcess.spawnError = error;
  });
  return backendProcess;
}

function stopBackend(backendProcess) {
  if (!backendProcess || backendProcess.killed) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${backendProcess.pid} /T /F`, { stdio: 'ignore' });
    } else {
      process.kill(-backendProcess.pid, 'SIGTERM');
    }
  } catch (_error) {
    try {
      backendProcess.kill('SIGTERM');
    } catch (_ignored) {
      // no-op
    }
  }
}

async function waitForHealth(backendProcess) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (backendProcess && backendProcess.exitCode !== null) {
      throw new Error(`Backend process exited before health check (exit=${backendProcess.exitCode})`);
    }
    if (backendProcess && backendProcess.spawnError) {
      throw backendProcess.spawnError;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/health`);
      if (response.ok) {
        return;
      }
    } catch (_error) {
      // no-op, keep polling until timeout
    }

    await sleep(HEALTH_POLL_MS);
  }

  throw new Error(`Timed out waiting for backend health at ${apiBaseUrl}/health`);
}

async function waitForDeckData(backendProcess) {
  const deadline = Date.now() + DATA_READY_TIMEOUT_MS;

  while (Date.now() < deadline) {
    if (backendProcess && backendProcess.exitCode !== null) {
      throw new Error(`Backend process exited before data readiness check (exit=${backendProcess.exitCode})`);
    }
    if (backendProcess && backendProcess.spawnError) {
      throw backendProcess.spawnError;
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/topics`);
      if (response.ok) {
        const payload = await response.json();
        const totalCards = Array.isArray(payload)
          ? payload.reduce((sum, item) => sum + Number(item?.count || 0), 0)
          : 0;
        if (totalCards >= MIN_READY_TOPIC_CARD_COUNT) {
          return;
        }
      }
    } catch (_error) {
      // no-op, keep polling until timeout
    }

    await sleep(HEALTH_POLL_MS);
  }

  throw new Error(`Timed out waiting for non-empty deck data at ${apiBaseUrl}/api/topics`);
}

async function main() {
  const useExternalBackend = Boolean(explicitApiBase);
  let backendProcess = null;

  try {
    if (useExternalBackend) {
      process.stdout.write(`\n> Using external backend for runtime deck verify: ${apiBaseUrl}\n`);
    } else {
      process.stdout.write(`\n> Starting backend for runtime deck verify on port ${DEFAULT_PORT}\n`);
      backendProcess = startBackend();
    }

    await waitForHealth(backendProcess);
    await waitForDeckData(backendProcess);
    process.stdout.write('\n> node scripts/verify_runtime_deck.js\n');
    execSync('node scripts/verify_runtime_deck.js', {
      stdio: 'inherit',
      env: {
        ...process.env,
        API_BASE_URL: apiBaseUrl
      }
    });
    process.stdout.write('\nRuntime deck verify gate: PASS\n');
  } finally {
    if (backendProcess) {
      stopBackend(backendProcess);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
