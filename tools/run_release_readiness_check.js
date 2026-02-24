#!/usr/bin/env node

const { execSync } = require('node:child_process');

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const commands = [
  'node tools/validate_flyway_migrations.js',
  'mvn -q -f backend/pom.xml test',
  `${npmBin} --prefix frontend run lint`,
  `${npmBin} --prefix frontend run test -- --run`,
  `${npmBin} --prefix frontend run build`,
  'node tools/validate_cards_v2.js data/smart10/cards.en.json',
  'node tools/validate_cards_v2.js data/smart10/cards.et.json',
  'node tools/score_cards_quality.js data/smart10/cards.en.json --fail-threshold=0.80',
  'node tools/score_cards_quality.js data/smart10/cards.et.json --fail-threshold=0.80',
  'node tools/report_semantic_warning_budget.js --max-warnings=80'
];

for (const command of commands) {
  process.stdout.write(`\n> ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    if (typeof error.status === 'number') {
      process.exit(error.status);
    }
    process.exit(1);
  }
}

process.stdout.write('\nRelease readiness check: PASS\n');
