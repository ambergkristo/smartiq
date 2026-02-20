#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_DATA_DIR = 'data/smart10';
const REQUIRED_LOCALES = ['en'];

function normalize(value) {
  return String(value ?? '').trim().toLowerCase();
}

function runValidator(filePath) {
  const validatorScript = path.resolve(__dirname, 'validate_cards_v2.js');
  const proc = spawnSync(
    process.execPath,
    [validatorScript, filePath, '--max-warnings=0'],
    { stdio: 'inherit' }
  );
  return proc.status ?? 1;
}

function main() {
  const dataDirArg = process.argv[2] || DEFAULT_DATA_DIR;
  const dataDir = path.resolve(process.cwd(), dataDirArg);

  if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(dataDir)
    .filter((name) => /^cards\.[a-z]{2}\.json$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  if (entries.length === 0) {
    console.error(`No locale pack files found under ${dataDir} (expected cards.<lang>.json).`);
    process.exit(1);
  }

  const foundLocales = entries.map((name) => normalize(name.split('.')[1]));
  const missingRequired = REQUIRED_LOCALES.filter((locale) => !foundLocales.includes(locale));
  if (missingRequired.length > 0) {
    console.error(`Missing required locale packs: ${missingRequired.join(', ')}`);
    process.exit(1);
  }

  console.log(`Found locale packs: ${foundLocales.join(', ')}`);

  let failures = 0;
  for (const entry of entries) {
    const locale = normalize(entry.split('.')[1]);
    const filePath = path.join(dataDirArg, entry).replace(/\\/g, '/');
    console.log(`\n[locale:${locale}] validating ${filePath}`);
    const status = runValidator(filePath);
    if (status !== 0) {
      failures += 1;
    }
  }

  if (!foundLocales.includes('et')) {
    console.log('\nEE pack status: cards.et.json not present yet (expected during prep phase).');
  }

  if (failures > 0) {
    console.error(`\nLocale validation failed for ${failures} file(s).`);
    process.exit(1);
  }

  console.log('\nLocale pack validation passed.');
}

main();
