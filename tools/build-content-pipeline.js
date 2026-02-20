#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function newestMatching(dir, prefix) {
  const files = fs.readdirSync(dir).filter((f) => f.startsWith(prefix)).sort();
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}

function main() {
  const targetPerKey = process.env.TARGET_PER_KEY || '50';
  run(`node tools/generate-cards.js --target-per-key=${targetPerKey}`);

  const rawDir = path.resolve(process.cwd(), 'data/raw');
  const latestRaw = newestMatching(rawDir, 'generated.refresh.');
  if (!latestRaw) {
    throw new Error('No generated raw file found.');
  }

  run(`node tools/review-cards.js ${latestRaw}`);

  const reviewDir = path.resolve(process.cwd(), 'data/review');
  const latestApproved = newestMatching(reviewDir, 'approved.');
  if (!latestApproved) {
    throw new Error('No approved review file found.');
  }

  const cleanTarget = path.resolve(process.cwd(), 'data/clean/generated.latest.clean.json');
  fs.copyFileSync(latestApproved, cleanTarget);
  console.log(`Updated clean dataset: ${path.relative(process.cwd(), cleanTarget)}`);

  run('node tools/review-summary.js');
  run(`node tools/validate_cards_v2.js ${cleanTarget}`);
}

main();
