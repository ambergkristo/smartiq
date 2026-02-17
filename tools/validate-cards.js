#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function validateCard(card, file, index, seen) {
  const errors = [];
  const required = ['id', 'topic', 'language', 'question', 'options', 'difficulty', 'source'];

  for (const key of required) {
    if (card[key] === undefined || card[key] === null || card[key] === '') {
      errors.push(`${file}[${index}] missing required field: ${key}`);
    }
  }

  if (!Array.isArray(card.options) || card.options.length !== 10) {
    errors.push(`${file}[${index}] options must be an array of exactly 10 entries`);
  }

  const hasCorrectIndex = Number.isInteger(card.correctIndex);
  const hasCorrectFlags = Array.isArray(card.correctFlags) && card.correctFlags.length === 10;

  if (!hasCorrectIndex && !hasCorrectFlags) {
    errors.push(`${file}[${index}] must include correctIndex or correctFlags[10]`);
  }

  if (hasCorrectIndex && (card.correctIndex < 0 || card.correctIndex > 9)) {
    errors.push(`${file}[${index}] correctIndex must be between 0 and 9`);
  }

  if (hasCorrectFlags && !card.correctFlags.every((x) => typeof x === 'boolean')) {
    errors.push(`${file}[${index}] correctFlags must contain only boolean values`);
  }

  const dupKey = `${normalizeText(card.topic)}|${normalizeText(card.language)}|${normalizeText(card.question)}`;
  if (seen.has(dupKey)) {
    errors.push(`${file}[${index}] duplicate question detected for topic/language`);
  } else {
    seen.add(dupKey);
  }

  return errors;
}

function main() {
  const targetDir = process.argv[2] || 'data/clean';
  const absoluteTarget = path.resolve(process.cwd(), targetDir);

  if (!fs.existsSync(absoluteTarget)) {
    console.error(`Directory does not exist: ${absoluteTarget}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(absoluteTarget).filter((f) => f.endsWith('.json')).sort();
  if (jsonFiles.length === 0) {
    console.error(`No .json files found in: ${absoluteTarget}`);
    process.exit(1);
  }

  const allErrors = [];
  const topicCounts = new Map();
  const seen = new Set();

  for (const file of jsonFiles) {
    const fullPath = path.join(absoluteTarget, file);
    let parsed;
    try {
      parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (err) {
      allErrors.push(`${file} is not valid JSON: ${err.message}`);
      continue;
    }

    if (!Array.isArray(parsed)) {
      allErrors.push(`${file} must contain a top-level array`);
      continue;
    }

    parsed.forEach((card, index) => {
      const errs = validateCard(card, file, index, seen);
      allErrors.push(...errs);
      const topic = String(card.topic || '').trim();
      if (topic) {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
      }
    });
  }

  if (allErrors.length > 0) {
    console.error('Validation failed:');
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Validation passed. Topic counts:');
  for (const [topic, count] of [...topicCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${topic}: ${count}`);
  }
}

main();