#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

function runStep(name, commandLine) {
  const result = spawnSync(commandLine, {
    shell: true,
    stdio: 'pipe',
    encoding: 'utf8'
  });

  return {
    name,
    command: commandLine,
    exitCode: result.status,
    ok: result.status === 0,
    error: result.error ? result.error.message : '',
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function main() {
  const steps = [];

  steps.push(
    runStep(
      'billing_usage_backend_tests',
      'mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest" test'
    )
  );

  const ok = steps.every((step) => step.ok);

  const output = {
    ok,
    gate: 'M6_BILLING_USAGE_GUARDRAILS',
    steps: steps.map((step) => ({
      name: step.name,
      command: step.command,
      ok: step.ok,
      exitCode: step.exitCode
    }))
  };

  console.log(JSON.stringify(output, null, 2));

  for (const step of steps) {
    if (!step.ok) {
      if (step.error && step.error.trim().length > 0) {
        console.error(`\n[${step.name}] error:\n${step.error.trim()}`);
      }
      if (step.stdout.trim().length > 0) {
        console.error(`\n[${step.name}] stdout:\n${step.stdout.trim()}`);
      }
      if (step.stderr.trim().length > 0) {
        console.error(`\n[${step.name}] stderr:\n${step.stderr.trim()}`);
      }
      process.exit(1);
    }
  }
}

main();
