#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeLanguage(value) {
  return normalizeText(value).toLowerCase();
}

function isIsoLanguage(value) {
  return /^[a-z]{2}(-[a-z]{2})?$/.test(value);
}

function cardSignature(card) {
  const options = Array.isArray(card.options) ? card.options.map(normalizeText).join('|') : '';
  return `${normalizeText(card.topic).toLowerCase()}|${normalizeLanguage(card.language)}|${normalizeText(card.question).toLowerCase()}|${options}`;
}

function validateCard(card, file, index, signatures) {
  const errors = [];
  const required = ['id', 'topic', 'language', 'question', 'options', 'difficulty', 'source', 'createdAt'];

  for (const key of required) {
    if (card[key] === undefined || card[key] === null || normalizeText(card[key]) === '') {
      errors.push(`${file}[${index}] missing required field: ${key}`);
    }
  }

  if (!Array.isArray(card.options) || card.options.length !== 10) {
    errors.push(`${file}[${index}] options must be an array of exactly 10 entries`);
  }

  if (Array.isArray(card.options)) {
    const normalizedOptions = card.options.map(normalizeText);
    if (normalizedOptions.some((opt) => !opt)) {
      errors.push(`${file}[${index}] options contain empty values`);
    }
    if (new Set(normalizedOptions.map((x) => x.toLowerCase())).size < normalizedOptions.length) {
      errors.push(`${file}[${index}] options contain duplicates`);
    }
  }

  const questionType = normalizeText(card.questionType || 'single').toLowerCase();
  if (!['single', 'multiple'].includes(questionType)) {
    errors.push(`${file}[${index}] questionType must be 'single' or 'multiple'`);
  }

  const hasCorrectIndex = Number.isInteger(card.correctIndex);
  const hasCorrectFlags = Array.isArray(card.correctFlags) && card.correctFlags.length === 10 && card.correctFlags.every((x) => typeof x === 'boolean');

  if (!hasCorrectIndex && !hasCorrectFlags) {
    errors.push(`${file}[${index}] must include correctIndex or correctFlags[10]`);
  }

  if (hasCorrectIndex && (card.correctIndex < 0 || card.correctIndex > 9)) {
    errors.push(`${file}[${index}] correctIndex must be between 0 and 9`);
  }

  if (hasCorrectFlags && card.correctFlags.filter(Boolean).length < 1) {
    errors.push(`${file}[${index}] correctFlags must include at least one true value`);
  }

  if (questionType === 'single' && !hasCorrectIndex) {
    errors.push(`${file}[${index}] questionType=single requires correctIndex`);
  }

  if (questionType === 'multiple' && !hasCorrectFlags) {
    errors.push(`${file}[${index}] questionType=multiple requires correctFlags`);
  }

  const language = normalizeLanguage(card.language);
  if (!isIsoLanguage(language)) {
    errors.push(`${file}[${index}] language must be ISO style (example: en, et, en-us)`);
  }

  const signature = cardSignature(card);
  if (signatures.has(signature)) {
    errors.push(`${file}[${index}] duplicate question/options signature detected`);
  } else {
    signatures.add(signature);
  }

  return errors;
}

function main() {
  const target = process.argv[2] || 'data/clean';
  const absoluteTarget = path.resolve(process.cwd(), target);

  if (!fs.existsSync(absoluteTarget)) {
    console.error(`Path does not exist: ${absoluteTarget}`);
    process.exit(1);
  }

  const isDirectory = fs.statSync(absoluteTarget).isDirectory();
  const jsonFiles = isDirectory
    ? fs.readdirSync(absoluteTarget).filter((f) => f.endsWith('.json')).sort()
    : [path.basename(absoluteTarget)];

  if (jsonFiles.length === 0) {
    console.error(`No .json files found in: ${absoluteTarget}`);
    process.exit(1);
  }

  const allErrors = [];
  const keyCounts = new Map();
  const signatures = new Set();

  for (const file of jsonFiles) {
    const fullPath = isDirectory ? path.join(absoluteTarget, file) : absoluteTarget;
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
      const errs = validateCard(card, file, index, signatures);
      allErrors.push(...errs);
      const key = `${normalizeText(card.topic)}|${normalizeText(card.difficulty)}|${normalizeLanguage(card.language)}`;
      keyCounts.set(key, (keyCounts.get(key) || 0) + 1);
    });
  }

  if (allErrors.length > 0) {
    console.error('Validation failed:');
    for (const error of allErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('Validation passed. Key counts (topic|difficulty|language):');
  for (const [key, count] of [...keyCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${key}: ${count}`);
  }
}

main();
