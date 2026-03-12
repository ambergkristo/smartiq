#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const BOARD_ANSWER_COUNT = 8;
const ACTIVE_LANGUAGE = 'en';
const ACTIVE_CATEGORIES = new Set(['TRUE_FALSE', 'NUMBER', 'CENTURY_DECADE', 'COLOR', 'OPEN']);
const CANONICAL_SOURCE_PATH = '../data/smart10/cards.en.json';
const APPLICATION_YML = path.join('backend', 'src', 'main', 'resources', 'application.yml');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function validateConfig() {
  const raw = fs.readFileSync(APPLICATION_YML, 'utf8');
  if (!raw.includes(`path: \${SMARTIQ_IMPORT_PATH:${CANONICAL_SOURCE_PATH}}`)) {
    fail(`application.yml must use single canonical import path ${CANONICAL_SOURCE_PATH}`);
  }
  if (!raw.includes('et-enabled: ${SMARTIQ_LANGUAGE_ET_ENABLED:false}')) {
    fail('application.yml must disable ET runtime by default');
  }
  if (raw.includes('../data/smart10/cards.et.json') || raw.includes('classpath:data/runtime/cards.en.json')) {
    fail('application.yml still references non-canonical runtime dataset sources');
  }
}

function optionText(option) {
  if (typeof option === 'string') {
    return option;
  }
  if (option && typeof option === 'object') {
    return option.text;
  }
  return null;
}

function optionCorrect(option) {
  return Boolean(option && typeof option === 'object' && option.correct);
}

function sourceCorrectIndexes(card) {
  const correct = card.correct;
  if (correct && Array.isArray(correct.correctIndexes)) {
    return [...new Set(correct.correctIndexes)];
  }
  if (correct && Number.isInteger(correct.correctIndex)) {
    return [correct.correctIndex];
  }
  const indexes = [];
  (card.options || []).forEach((option, index) => {
    if (optionCorrect(option)) {
      indexes.push(index);
    }
  });
  return [...new Set(indexes)];
}

function normalizeProjection(sourceOptions, priorityIndexes, cardId) {
  if (!Array.isArray(sourceOptions) || sourceOptions.length < BOARD_ANSWER_COUNT) {
    throw new Error(`Card must contain at least 8 options: ${cardId}`);
  }

  const included = new Set();
  for (const index of priorityIndexes) {
    if (!Number.isInteger(index) || index < 0 || index >= sourceOptions.length) {
      throw new Error(`Card correctness index is out of bounds: ${cardId}`);
    }
    included.add(index);
  }

  for (let index = 0; index < sourceOptions.length && included.size < BOARD_ANSWER_COUNT; index += 1) {
    included.add(index);
  }

  if (included.size < BOARD_ANSWER_COUNT) {
    throw new Error(`Card must contain at least 8 usable options: ${cardId}`);
  }

  const projected = [];
  const sourceToNormalized = new Map();
  for (let sourceIndex = 0; sourceIndex < sourceOptions.length; sourceIndex += 1) {
    if (!included.has(sourceIndex)) {
      continue;
    }
    projected.push(sourceOptions[sourceIndex]);
    sourceToNormalized.set(sourceIndex, projected.length - 1);
    if (projected.length >= BOARD_ANSWER_COUNT) {
      break;
    }
  }

  return { projected, sourceToNormalized };
}

function validateCard(card) {
  const cardId = String(card.id || card.cardId || '').trim();
  if (!cardId) {
    throw new Error('Card id is required');
  }
  if (String(card.language || ACTIVE_LANGUAGE).trim().toLowerCase() !== ACTIVE_LANGUAGE) {
    throw new Error(`Card language is not active: ${cardId}`);
  }
  const category = String(card.category || 'OPEN').trim().toUpperCase();
  if (!ACTIVE_CATEGORIES.has(category)) {
    throw new Error(`Card category is not active: ${cardId}`);
  }

  const sourceOptions = (card.options || []).map(optionText);
  if (sourceOptions.some((value) => typeof value !== 'string' || !value.trim())) {
    throw new Error(`Card contains blank option text: ${cardId}`);
  }

  const correctIndexes = sourceCorrectIndexes(card);
  if (correctIndexes.length < 1) {
    throw new Error(`Card must include at least one correct answer: ${cardId}`);
  }
  if (correctIndexes.length > BOARD_ANSWER_COUNT) {
    throw new Error(`Card has too many correct answers for CherryPick board: ${cardId}`);
  }
  if (category !== 'TRUE_FALSE' && category !== 'OPEN' && correctIndexes.length !== 1) {
    throw new Error(`Card must include exactly one correct answer: ${cardId}`);
  }

  const { projected, sourceToNormalized } = normalizeProjection(sourceOptions, correctIndexes, cardId);
  if (projected.length !== BOARD_ANSWER_COUNT) {
    throw new Error(`Card did not normalize to 8 answers: ${cardId}`);
  }

  const normalizedCorrect = correctIndexes.map((index) => sourceToNormalized.get(index));
  if (normalizedCorrect.some((index) => !Number.isInteger(index) || index < 0 || index >= BOARD_ANSWER_COUNT)) {
    throw new Error(`Card correct mapping falls outside normalized board: ${cardId}`);
  }
}

function main() {
  const datasetArg = process.argv[2] || path.join('data', 'smart10', 'cards.en.json');
  validateConfig();

  const cards = readJson(datasetArg);
  if (!Array.isArray(cards)) {
    fail('Dataset must be a JSON array');
  }

  const activeIds = new Set();
  let activeCount = 0;
  let skippedInactive = 0;

  for (const card of cards) {
    const language = String(card.language || ACTIVE_LANGUAGE).trim().toLowerCase();
    const category = String(card.category || 'OPEN').trim().toUpperCase();
    if (language !== ACTIVE_LANGUAGE || !ACTIVE_CATEGORIES.has(category)) {
      skippedInactive += 1;
      continue;
    }

    const id = String(card.id || card.cardId || '').trim();
    if (activeIds.has(id)) {
      fail(`Duplicate active card id: ${id}`);
    }
    activeIds.add(id);
    validateCard(card);
    activeCount += 1;
  }

  if (activeCount === 0) {
    fail('No active CherryPick cards found in canonical dataset');
  }

  console.log(`PASS: ${datasetArg}`);
  console.log(`Active cards: ${activeCount}`);
  console.log(`Skipped inactive cards: ${skippedInactive}`);
  console.log(`Canonical import path: ${CANONICAL_SOURCE_PATH}`);
}

main();
