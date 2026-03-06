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
    env: process.env
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

function readSummary(summaryPath) {
  return JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const snapshotPath = parseArg(args, '--snapshot=') || process.env.SMARTIQ_M6_PILOT_SNAPSHOT || '';
  const reportPath = parseArg(args, '--output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-pilot-summary.md');
  const summaryPath = parseArg(args, '--json-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-pilot-summary.json');
  const evidencePath = parseArg(args, '--evidence-output=') || path.join(os.tmpdir(), 'smartiq-recurring-host-pilot-evidence.md');
  const failOnBelowThreshold = hasFlag(args, '--fail-on-below-threshold');

  const steps = [
    runStep(
      'pilot_backend_tests',
      'mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,GameSessionControllerTest,BillingServiceTest" test'
    ),
    runStep(
      'pilot_admin_frontend_tests',
      'npm --prefix frontend run test -- --run src/admin/api.test.js src/admin/AdminConsole.test.jsx'
    )
  ];

  const generatorArgs = ['node tools/generate_recurring_host_pilot_summary.js', `--output=${reportPath}`, `--json-output=${summaryPath}`];
  if (snapshotPath) {
    generatorArgs.push(`--snapshot=${snapshotPath}`);
  }
  if (failOnBelowThreshold) {
    generatorArgs.push('--fail-on-below-threshold');
  }

  steps.push(runStep('pilot_summary_report', generatorArgs.join(' ')));
  steps.push(runStep(
    'pilot_evidence_pack',
    `node tools/generate_recurring_host_pilot_evidence.js --summary-json=${summaryPath} --output=${evidencePath}`
  ));

  const generatorStep = steps.find((step) => step.name === 'pilot_summary_report');
  let summary = null;
  if (generatorStep.ok && fs.existsSync(summaryPath)) {
    summary = readSummary(summaryPath);
  }

  const belowThreshold = summary && summary.thresholdStatus !== 'READY';
  const ok = steps.every((step) => step.ok) && !(failOnBelowThreshold && belowThreshold);

  const output = {
    ok,
    gate: 'M6_RECURRING_HOST_PILOT',
    reportPath,
    summaryPath,
    evidencePath,
    thresholdStatus: summary ? summary.thresholdStatus : 'unknown',
    aggregate: summary ? summary.aggregate : null,
    steps: steps.map((step) => ({
      name: step.name,
      command: step.command,
      ok: step.ok,
      exitCode: step.exitCode
    }))
  };

  console.log(JSON.stringify(output, null, 2));

  for (const step of steps) {
    if (step.ok) {
      continue;
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
    process.exit(1);
  }

  if (failOnBelowThreshold && belowThreshold) {
    console.error(`Pilot summary is below threshold: ${summary.thresholdStatus}`);
    process.exit(1);
  }
}

main();
