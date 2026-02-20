#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = 'data/smart10/et.localization.overrides.json';

function normalize(value) {
  return String(value ?? '').normalize('NFKC').trim();
}

function main() {
  const target = process.argv[2] || DEFAULT_PATH;
  const abs = path.resolve(process.cwd(), target);
  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(raw);

  const errors = [];
  const seenFrom = new Map();

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push('root must be an object');
  }

  const replacements = parsed?.replacements;
  if (!Array.isArray(replacements)) {
    errors.push('replacements must be an array');
  } else if (replacements.length === 0) {
    errors.push('replacements must not be empty');
  } else {
    for (let i = 0; i < replacements.length; i += 1) {
      const item = replacements[i];
      const context = `replacements[${i}]`;
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push(`${context} must be an object`);
        continue;
      }

      const from = normalize(item.from);
      const to = normalize(item.to);
      if (!from) errors.push(`${context}.from must be non-empty`);
      if (!to) errors.push(`${context}.to must be non-empty`);
      if (from && to && from === to) {
        errors.push(`${context} has identical from/to: "${from}"`);
      }

      if (from) {
        const prior = seenFrom.get(from);
        if (prior != null) {
          errors.push(`${context}.from duplicates replacements[${prior}].from: "${from}"`);
        } else {
          seenFrom.set(from, i);
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        file: abs,
        replacementCount: Array.isArray(replacements) ? replacements.length : 0,
        errorCount: errors.length,
      },
      null,
      2
    )
  );

  if (errors.length > 0) {
    console.error('\nET overrides validation errors:');
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log('\nET overrides validation passed.');
}

main();
