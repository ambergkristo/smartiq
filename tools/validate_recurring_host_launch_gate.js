#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function runStep(name, commandLine) {
  const result = spawnSync(commandLine, {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8',
    env: { ...process.env }
  });

  return {
    name,
    command: commandLine,
    exitCode: result.status,
    ok: result.status === 0,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : ''
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function printFailedStep(step) {
  if (!step || step.ok) {
    return;
  }
  if (step.error.trim()) {
    console.error(`\n[${step.name}] error:\n${step.error.trim()}`);
  }
  if (step.stdout.trim()) {
    console.error(`\n[${step.name}] stdout:\n${step.stdout.trim()}`);
  }
  if (step.stderr.trim()) {
    console.error(`\n[${step.name}] stderr:\n${step.stderr.trim()}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const summaryPath = parseArg(args, '--summary-json=') || path.join(os.tmpdir(), 'smartiq-recurring-host-launch-summary.json');
  const summaryMarkdownPath = parseArg(args, '--summary-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-launch-summary.md');
  const dashboardPath = parseArg(args, '--dashboard-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-launch-kpi.md');
  const skipReleaseCheck = hasFlag(args, '--skip-release-check');
  const skipSmoke = hasFlag(args, '--skip-smoke');
  const skipAlertValidation = hasFlag(args, '--skip-alert-validation');
  const summaryExists = fs.existsSync(summaryPath);

  const steps = [];

  if (!skipReleaseCheck) {
    steps.push(runStep('release_readiness', 'npm run release:check'));
  }

  if (!skipAlertValidation) {
    steps.push(runStep('launch_alert_validation', 'npm run validate:beta:alerts'));
  }

  if (!skipSmoke) {
    steps.push(runStep('launch_scope_smoke', 'node tools/post-deploy-smoke.js'));
  }

  if (!summaryExists) {
    steps.push(runStep(
      'recurring_host_pilot_summary',
      `node tools/generate_recurring_host_pilot_summary.js --output=${summaryMarkdownPath} --json-output=${summaryPath}`
    ));
  }

  steps.push(runStep(
    'recurring_host_launch_kpi_dashboard',
    `node tools/generate_recurring_host_launch_kpi_dashboard.js --summary-json=${summaryPath} --output=${dashboardPath}`
  ));

  const failed = steps.find((step) => !step.ok);
  if (failed) {
    printFailedStep(failed);
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const output = {
    ok: true,
    gate: 'M7_RECURRING_HOST_LAUNCH',
    summaryPath,
    dashboardPath,
    m6ThresholdStatus: summary.thresholdStatus || 'unknown',
    externalProofDeferred: summary.thresholdStatus !== 'READY',
    aggregate: summary.aggregate || null,
    steps: steps.map((step) => ({
      name: step.name,
      command: step.command,
      ok: step.ok,
      exitCode: step.exitCode
    }))
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
