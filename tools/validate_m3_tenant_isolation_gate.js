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
    runStep('flyway_migration_validation', 'node tools/validate_flyway_migrations.js')
  );

  steps.push(
    runStep(
      'tenant_auth_isolation_tests',
      'mvn -q -f backend/pom.xml "-Dtest=TenantAdminControllerTest,TenantMeControllerTest,TenantMeControllerProdAuthContextTest,SecurityConfigTest" test'
    )
  );

  const ok = steps.every((step) => step.ok);

  const output = {
    ok,
    gate: 'M3_AUTH_TENANT_ISOLATION',
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
