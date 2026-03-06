#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function nowIso() {
  return new Date().toISOString();
}

function todayStamp() {
  return nowIso().slice(0, 10);
}

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function run(commandLine) {
  return spawnSync(commandLine, {
    cwd: process.cwd(),
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8',
    env: process.env
  });
}

function main() {
  const args = process.argv.slice(2);
  const stamp = parseArg(args, '--stamp=') || todayStamp();
  const suffix = parseArg(args, '--suffix=');
  const outputDir = parseArg(args, '--output-dir=') || 'docs/reports';
  const snapshotPath = parseArg(args, '--snapshot=');
  const failOnBelowThreshold = hasFlag(args, '--fail-on-below-threshold');

  const baseName = suffix
    ? `${stamp}-recurring-host-saas-m6-pilot-${suffix}`
    : `${stamp}-recurring-host-saas-m6-pilot`;

  const reportPath = path.join(outputDir, `${baseName}-summary.md`);
  const summaryPath = path.join(outputDir, `${baseName}-summary.json`);
  const evidencePath = path.join(outputDir, `${baseName}-evidence.md`);
  const gatePath = path.join(outputDir, `${baseName}-gate.json`);

  [reportPath, summaryPath, evidencePath, gatePath].forEach(ensureDir);

  const commandParts = [
    'node tools/validate_recurring_host_pilot_gate.js',
    `--output=${reportPath}`,
    `--json-output=${summaryPath}`,
    `--evidence-output=${evidencePath}`
  ];
  if (snapshotPath) {
    commandParts.push(`--snapshot=${snapshotPath}`);
  }
  if (failOnBelowThreshold) {
    commandParts.push('--fail-on-below-threshold');
  }

  const result = run(commandParts.join(' '));
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  const gatePayload = result.stdout.trim();
  if (!gatePayload) {
    throw new Error('Pilot gate did not return JSON output.');
  }

  let parsed;
  try {
    parsed = JSON.parse(gatePayload);
  } catch (error) {
    throw new Error(`Pilot gate output was not valid JSON: ${error.message}`);
  }

  fs.writeFileSync(gatePath, `${JSON.stringify(parsed, null, 2)}\n`);
  console.log(`Recurring host pilot capture written: ${gatePath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
