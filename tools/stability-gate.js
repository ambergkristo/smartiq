#!/usr/bin/env node
const { execSync } = require('child_process');

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function main() {
  run('mvn -q -f backend/pom.xml test');
  run('npm run pipeline:cards');
  run('npm run load:test');
  console.log('Stability gate passed: CI-equivalent backend checks, pipeline, and load test completed.');
}

main();