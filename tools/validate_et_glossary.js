#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const DEFAULT_DATASET = 'data/smart10/cards.et.json';

// Deprecated ET variants we do not want to reintroduce.
const FORBIDDEN_VARIANTS = [
  'suumfooniaid',
  'toed vaited',
  'world soda i',
  'world soda ii',
  'cold soda',
  'poolaeg marathon',
  'wwi begins',
  'wwii begins',
  'wwii ends',
];

function normalize(value) {
  return String(value ?? '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
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

function main() {
  const datasetPath = process.argv[2] || DEFAULT_DATASET;
  const { abs, cards } = loadCards(datasetPath);
  const hits = [];

  for (let i = 0; i < cards.length; i += 1) {
    const card = cards[i] || {};
    const id = card.cardId || card.id || `<card-${i}>`;
    const question = normalize(card.question);
    for (const forbidden of FORBIDDEN_VARIANTS) {
      if (question.includes(forbidden)) {
        hits.push(`id=${id} question contains "${forbidden}"`);
      }
    }

    const options = Array.isArray(card.options) ? card.options : [];
    for (let o = 0; o < options.length; o += 1) {
      const text = normalize(typeof options[o] === 'string' ? options[o] : options[o]?.text);
      for (const forbidden of FORBIDDEN_VARIANTS) {
        if (text.includes(forbidden)) {
          hits.push(`id=${id} option[${o}] contains "${forbidden}"`);
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        dataset: abs,
        cards: cards.length,
        forbiddenCount: FORBIDDEN_VARIANTS.length,
        violationCount: hits.length,
      },
      null,
      2
    )
  );

  if (hits.length > 0) {
    console.error('\nET glossary consistency violations:');
    for (const line of hits.slice(0, 120)) {
      console.error(`- ${line}`);
    }
    if (hits.length > 120) {
      console.error(`- ...and ${hits.length - 120} more`);
    }
    process.exit(1);
  }

  console.log('\nET glossary consistency validation passed.');
}

main();
