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
      'runtime_branding_tests',
      'npm --prefix frontend run test -- --run src/App.tenant-runtime.test.jsx src/admin/AdminConsole.test.jsx'
    )
  );

  steps.push(
    runStep('frontend_build', 'npm --prefix frontend run build')
  );

  const ok = steps.every((step) => step.ok);

  const output = {
    ok,
    gate: 'M4_RUNTIME_WHITE_LABEL',
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
