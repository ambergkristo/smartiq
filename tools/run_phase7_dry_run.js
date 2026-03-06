#!/usr/bin/env node
/* eslint-disable no-console */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function parseIntOption(args, prefix, envKey, fallback, min, max) {
  const raw = parseArg(args, prefix) || (envKey ? (process.env[envKey] || '').trim() : '');
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toArg(name, value) {
  return `--${name}=${value}`;
}

function runCommand(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, {
    stdio: 'inherit',
    env: {
      ...process.env,
      ...extraEnv
    }
  });
  if (result.error) {
    console.error(`Failed to execute ${command}: ${result.error.message}`);
    return 1;
  }
  if (typeof result.status !== 'number') {
    return 1;
  }
  return result.status;
}

function main() {
  const args = process.argv.slice(2);
  const printOnly = hasFlag(args, '--print-only');
  const backendUrl = parseArg(args, '--backend-url=') || (process.env.BACKEND_URL || '').trim();
  const fallbackPrometheusFile = path.resolve(process.cwd(), 'docs/reports/fixtures/prometheus-beta-sample.txt');
  const offlineMode = !backendUrl && require('node:fs').existsSync(fallbackPrometheusFile);
  const smokeLanguage = parseArg(args, '--smoke-language=') || (process.env.SMOKE_LANGUAGE || 'en').trim();
  const smokeRetries = parseIntOption(args, '--smoke-retries=', 'PHASE7_SMOKE_RETRIES', 20, 1, 120);
  const smokeRetryDelayMs = parseIntOption(args, '--smoke-retry-delay-ms=', 'PHASE7_SMOKE_RETRY_DELAY_MS', 5000, 0, 60000);
  const smokeTimeoutMs = parseIntOption(args, '--smoke-timeout-ms=', 'PHASE7_SMOKE_TIMEOUT_MS', 12000, 1000, 120000);
  const prometheusRetries = parseIntOption(args, '--prometheus-retries=', 'PHASE7_PROMETHEUS_RETRIES', 20, 1, 120);
  const prometheusRetryDelayMs = parseIntOption(args, '--prometheus-retry-delay-ms=', 'PHASE7_PROMETHEUS_RETRY_DELAY_MS', 5000, 0, 60000);
  const prometheusTimeoutMs = parseIntOption(args, '--prometheus-timeout-ms=', 'PHASE7_PROMETHEUS_TIMEOUT_MS', 12000, 1000, 180000);

  if (!backendUrl && !offlineMode) {
    console.error('Missing backend URL. Provide --backend-url=<https://...> or BACKEND_URL (or add docs/reports/fixtures/prometheus-beta-sample.txt).');
    process.exit(1);
  }

  const stamp = nowStamp();
  const reportPath = path.resolve(
    process.cwd(),
    parseArg(args, '--report-path=') || `docs/reports/beta-summary-local-${stamp}.md`
  );
  const evidencePath = path.resolve(
    process.cwd(),
    parseArg(args, '--out=') || `docs/reports/phase7-dry-run-evidence-local-${stamp}.md`
  );

  const thresholds = {
    minStartedGames: parseArg(args, '--min-started-games=') || '20',
    minCompletedGames: parseArg(args, '--min-completed-games=') || '15',
    maxDropoff: parseArg(args, '--max-dropoff=') || '0.35',
    maxWrongAnswer: parseArg(args, '--max-wrong-answer=') || '0.45',
    minReconnectSuccess: parseArg(args, '--min-reconnect-success=') || '0.90',
    maxJoinFailure: parseArg(args, '--max-join-failure=') || '0.15',
    maxWsFailure: parseArg(args, '--max-ws-failure=') || '0.10'
  };

  const smokeCommand = {
    command: process.execPath,
    args: ['tools/smoke-test.js'],
    env: {
      BACKEND_URL: backendUrl,
      SMOKE_LANGUAGE: smokeLanguage,
      SMOKE_RETRY_ATTEMPTS: String(smokeRetries),
      SMOKE_RETRY_DELAY_MS: String(smokeRetryDelayMs),
      SMOKE_REQUEST_TIMEOUT_MS: String(smokeTimeoutMs)
    }
  };

  const gateCommand = {
    command: process.execPath,
    args: [
      'tools/generate_beta_summary_report.js',
      toArg('out', reportPath),
      toArg('min-started-games', thresholds.minStartedGames),
      toArg('min-completed-games', thresholds.minCompletedGames),
      toArg('max-dropoff', thresholds.maxDropoff),
      toArg('max-wrong-answer', thresholds.maxWrongAnswer),
      toArg('min-reconnect-success', thresholds.minReconnectSuccess),
      toArg('max-join-failure', thresholds.maxJoinFailure),
      toArg('max-ws-failure', thresholds.maxWsFailure),
      toArg('prometheus-retries', String(prometheusRetries)),
      toArg('prometheus-retry-delay-ms', String(prometheusRetryDelayMs)),
      toArg('prometheus-timeout-ms', String(prometheusTimeoutMs)),
      '--fail-on-no-go'
    ],
    env: {}
  };
  if (!offlineMode) {
    gateCommand.args.splice(1, 0, toArg('backend-url', backendUrl));
  } else {
    gateCommand.args.splice(1, 0, toArg('prometheus-file', fallbackPrometheusFile));
  }

  if (printOnly) {
    console.log('Phase 7 dry-run command plan:');
    console.log(JSON.stringify({
      backendUrl,
      offlineMode,
      fallbackPrometheusFile: fallbackPrometheusFile.replace(/\\/g, '/'),
      smokeLanguage,
      reportPath: reportPath.replace(/\\/g, '/'),
      evidencePath: evidencePath.replace(/\\/g, '/'),
      retryPolicy: {
        smokeRetries,
        smokeRetryDelayMs,
        smokeTimeoutMs,
        prometheusRetries,
        prometheusRetryDelayMs,
        prometheusTimeoutMs
      },
      thresholds,
      smokeCommand,
      gateCommand
    }, null, 2));
    process.exit(0);
  }

  let smokeExitCode = 0;
  if (!offlineMode) {
    console.log('Phase 7 local dry-run: running smoke test...');
    smokeExitCode = runCommand(smokeCommand.command, smokeCommand.args, smokeCommand.env);
  } else {
    console.log('Phase 7 local dry-run: backend URL missing, smoke test skipped (offline fixture mode).');
  }

  console.log('Phase 7 local dry-run: running beta go/no-go gate...');
  const gateExitCode = runCommand(gateCommand.command, gateCommand.args, gateCommand.env);

  console.log('Phase 7 local dry-run: generating evidence...');
  const evidenceExitCode = runCommand(process.execPath, [
    'tools/generate_phase7_dry_run_evidence.js',
    toArg('out', evidencePath),
    toArg('backend-url', backendUrl || 'offline-fixture'),
    toArg('report-path', reportPath),
    toArg('smoke-exit-code', String(smokeExitCode)),
    toArg('gate-exit-code', String(gateExitCode)),
    toArg('min-started-games', thresholds.minStartedGames),
    toArg('min-completed-games', thresholds.minCompletedGames),
    toArg('max-dropoff', thresholds.maxDropoff),
    toArg('max-wrong-answer', thresholds.maxWrongAnswer),
    toArg('min-reconnect-success', thresholds.minReconnectSuccess),
    toArg('max-join-failure', thresholds.maxJoinFailure),
    toArg('max-ws-failure', thresholds.maxWsFailure)
  ]);

  if (evidenceExitCode !== 0) {
    console.error('Failed to generate dry-run evidence.');
    process.exit(1);
  }

  console.log(`Phase 7 dry-run evidence: ${evidencePath.replace(/\\/g, '/')}`);
  console.log(`Beta summary report: ${reportPath.replace(/\\/g, '/')}`);
  console.log(`Smoke exit code: ${smokeExitCode}`);
  console.log(`Gate exit code: ${gateExitCode}`);

  if (smokeExitCode !== 0) {
    console.error('Phase 7 local dry-run failed: smoke test failed.');
    process.exit(1);
  }
  if (gateExitCode === 2) {
    console.error('Phase 7 local dry-run failed: beta gate returned NO-GO.');
    process.exit(2);
  }
  if (gateExitCode !== 0) {
    console.error('Phase 7 local dry-run failed: beta gate execution error.');
    process.exit(1);
  }

  console.log('Phase 7 local dry-run passed.');
}

main();
