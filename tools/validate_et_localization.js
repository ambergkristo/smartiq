#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_DATASET = 'data/smart10/cards.et.json';

// English scaffolding fragments that should not appear in ET runtime cards.
const FORBIDDEN_FRAGMENTS = [
  'mark statements that are true',
  'which claims are accurate',
  'find the statements that fit',
  'select all true statements',
  'which lines are correct',
  'identify valid statements',
  'focus area:',
  'context tag:',
  'topic clue:',
  'in which year did',
  'which color matches',
  'pick the color best matching',
  'choose the color cue',
  'order earliest to latest',
  'use strict ascending order',
  'theme:',
];

function normalize(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function loadCards(datasetPath) {
  const abs = path.resolve(process.cwd(), datasetPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Dataset must be a top-level array');
  }
  return { abs, cards: parsed };
}

function scanText(text, context, hits) {
  const normalized = normalize(text);
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    if (normalized.includes(fragment)) {
      hits.push(`${context}: contains forbidden EN fragment "${fragment}"`);
    }
  }
}

function main() {
  const datasetPath = process.argv[2] || DEFAULT_DATASET;
  const { abs, cards } = loadCards(datasetPath);

  const hardErrors = [];
  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i] || {};
    const context = `cards[${i}] id=${card.cardId || card.id || '<missing>'}`;
    scanText(card.question, `${context} question`, hardErrors);

    const options = Array.isArray(card.options) ? card.options : [];
    for (let o = 0; o < options.length; o += 1) {
      const opt = options[o];
      const text = typeof opt === 'string' ? opt : opt?.text;
      scanText(text, `${context} option[${o}]`, hardErrors);
    }
  }

  const summary = {
    dataset: abs,
    cards: cards.length,
    hardErrorCount: hardErrors.length,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (hardErrors.length > 0) {
    console.error('\nET localization violations:');
    for (const err of hardErrors.slice(0, 120)) {
      console.error(`- ${err}`);
    }
    if (hardErrors.length > 120) {
      console.error(`- ...and ${hardErrors.length - 120} more`);
    }
    process.exit(1);
  }

  console.log('\nET localization validation passed.');
}

main();
