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

function toInt(value) {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
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
  const summaryPath = parseArg(args, '--summary-json=');
  const goNoGoPath = parseArg(args, '--go-no-go-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-m8-go-no-go.md');
  const operatingPlanPath = parseArg(args, '--operating-plan-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-m8-operating-plan.md');

  if (!summaryPath) {
    console.error('Usage: node tools/validate_recurring_host_sellable_saas_gate.js --summary-json=<path> [--go-no-go-output=<path>] [--operating-plan-output=<path>]');
    process.exit(1);
  }

  const steps = [
    runStep(
      'recurring_host_go_no_go_pack',
      `node tools/generate_recurring_host_go_no_go_pack.js --summary-json=${summaryPath} --output=${goNoGoPath}`
    ),
    runStep(
      'recurring_host_operating_plan',
      `node tools/generate_recurring_host_operating_plan.js --summary-json=${summaryPath} --output=${operatingPlanPath}`
    )
  ];

  const failed = steps.find((step) => !step.ok);
  if (failed) {
    printFailedStep(failed);
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const aggregate = summary.aggregate || {};
  const realActivatedHosts = toInt(aggregate.realActivatedHosts);
  const realRepeatHosts = toInt(aggregate.realRepeatHosts);
  const realPaidConversions = toInt(aggregate.realPaidConversions);
  const ready = realActivatedHosts >= 5 && realRepeatHosts >= 3 && realPaidConversions >= 3;

  console.log(JSON.stringify({
    ok: true,
    gate: 'M8_RECURRING_HOST_SELLABLE_SAAS',
    summaryPath,
    goNoGoPath,
    operatingPlanPath,
    externalProofDeferred: !ready,
    thresholds: {
      minRealActivatedHosts: 5,
      minRealRepeatHosts: 3,
      minRealPaidConversions: 3
    },
    aggregate: {
      realActivatedHosts,
      realRepeatHosts,
      realPaidConversions
    },
    steps: steps.map((step) => ({
      name: step.name,
      command: step.command,
      ok: step.ok,
      exitCode: step.exitCode
    }))
  }, null, 2));
}

main();
