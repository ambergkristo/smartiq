#!/usr/bin/env node

const { execSync } = require('node:child_process');

const commands = [
  'mvn -q -Dmaven.repo.local=.m2/repository -f backend/pom.xml test',
  'npm.cmd --prefix frontend run lint',
  'npm.cmd --prefix frontend run test -- --run',
  'node tools/validate_cards_v2.js',
  'node tools/score_cards_quality.js --fail-threshold=0.60'
];

for (const command of commands) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    if (typeof error.status === 'number') {
      process.exit(error.status);
    }
    process.exit(1);
  }
}

console.log('\nLocal Verification Gate: PASS');
