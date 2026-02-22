#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const migrationDirArg = process.argv[2] || 'backend/src/main/resources/db/migration';
const migrationDir = path.resolve(process.cwd(), migrationDirArg);

if (!fs.existsSync(migrationDir)) {
  console.error(`Migration directory not found: ${migrationDir}`);
  process.exit(1);
}

const files = fs.readdirSync(migrationDir).sort((a, b) => a.localeCompare(b));
const versioned = files.filter((name) => /^V\d+__.+\.sql$/i.test(name));
const repeatable = files.filter((name) => /^R__.+\.sql$/i.test(name));

if (versioned.length === 0) {
  console.error('No Flyway versioned migrations found.');
  process.exit(1);
}

const versions = versioned.map((name) => Number.parseInt(name.slice(1, name.indexOf('__')), 10));
const duplicates = versions.filter((value, index) => versions.indexOf(value) !== index);
if (duplicates.length > 0) {
  console.error(`Duplicate migration versions found: ${[...new Set(duplicates)].join(', ')}`);
  process.exit(1);
}

const sorted = [...versions].sort((a, b) => a - b);
const first = sorted[0];
if (first !== 1) {
  console.error(`Flyway versioned migrations must start at V1, found V${first} as first.`);
  process.exit(1);
}

for (let i = 1; i < sorted.length; i += 1) {
  if (sorted[i] !== sorted[i - 1] + 1) {
    console.error(`Missing migration version between V${sorted[i - 1]} and V${sorted[i]}.`);
    process.exit(1);
  }
}

const summary = {
  migrationDir,
  versionedMigrations: versioned,
  repeatableMigrations: repeatable,
  highestVersion: sorted[sorted.length - 1]
};

console.log(JSON.stringify(summary, null, 2));
console.log('\nFlyway migration validation passed.');
