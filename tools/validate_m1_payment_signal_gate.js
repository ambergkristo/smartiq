#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadJson(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Missing ledger file: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

function toArray(value, fieldName) {
  if (!Array.isArray(value)) {
    fail(`Expected array field: ${fieldName}`);
  }
  return value;
}

function countQualifiedOutreach(rows) {
  return rows.filter((row) => row && row.qualified === true).length;
}

function countQualifiedDiscovery(rows) {
  return rows.filter((row) => row && row.qualified === true).length;
}

function countPilotReadySignals(rows) {
  return rows.filter((row) => row && row.signalType === 'paid_pilot_ready').length;
}

function thresholdOrFail(targets, key) {
  const value = targets[key];
  if (!Number.isInteger(value) || value < 0) {
    fail(`Invalid target threshold for ${key}`);
  }
  return value;
}

function main() {
  const ledgerPath = process.argv[2] || 'docs/plans/2026-03-05-m1-payment-signal-ledger.json';
  const ledger = loadJson(ledgerPath);

  const targets = ledger.targets || {};
  const outreachMin = thresholdOrFail(targets, 'outreachAttemptsMin');
  const discoveryMin = thresholdOrFail(targets, 'discoveryCallsMin');
  const pilotSignalsMin = thresholdOrFail(targets, 'paidPilotReadySignalsMin');

  const outreachAttempts = toArray(ledger.outreachAttempts, 'outreachAttempts');
  const discoveryCalls = toArray(ledger.discoveryCalls, 'discoveryCalls');
  const pilotIntentSignals = toArray(ledger.pilotIntentSignals, 'pilotIntentSignals');

  const outreachCount = countQualifiedOutreach(outreachAttempts);
  const discoveryCount = countQualifiedDiscovery(discoveryCalls);
  const pilotSignalsCount = countPilotReadySignals(pilotIntentSignals);

  const checks = [
    {
      name: 'qualified_outreach_attempts',
      actual: outreachCount,
      minimum: outreachMin
    },
    {
      name: 'qualified_discovery_calls',
      actual: discoveryCount,
      minimum: discoveryMin
    },
    {
      name: 'paid_pilot_ready_signals',
      actual: pilotSignalsCount,
      minimum: pilotSignalsMin
    }
  ];

  const failing = checks.filter((check) => check.actual < check.minimum);

  const output = {
    ok: failing.length === 0,
    milestone: ledger.milestone || 'M1',
    sprint: ledger.sprint || 'S1',
    updatedAt: ledger.updatedAt || null,
    checks
  };

  console.log(JSON.stringify(output, null, 2));

  if (failing.length > 0) {
    process.exit(1);
  }
}

main();
