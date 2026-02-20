#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOPICS = ['History', 'Sports', 'Geography', 'Culture', 'Science', 'Varia'];
const CATEGORIES = ['TRUE_FALSE', 'NUMBER', 'ORDER', 'CENTURY_DECADE', 'COLOR', 'OPEN'];
const MAX_OPTION_LEN = 42;

function normalizeText(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function normalizeLoose(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function loadCards(targetPath) {
  const abs = path.resolve(process.cwd(), targetPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`Path does not exist: ${abs}`);
  }

  const parsed = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error('Dataset must be a top-level array');
  }

  return { cards: parsed, abs };
}

function validateCorrect(card, errors, context) {
  const cat = card.category;
  const correct = card.correct;
  if (!correct || typeof correct !== 'object') {
    errors.push(`${context} missing correct payload`);
    return;
  }

  const inBounds = (n) => Number.isInteger(n) && n >= 0 && n < 10;

  if (cat === 'TRUE_FALSE' || cat === 'OPEN') {
    if (!Array.isArray(correct.correctIndexes) || correct.correctIndexes.length < 1) {
      errors.push(`${context} ${cat} requires correct.correctIndexes[]`);
      return;
    }
    const unique = [...new Set(correct.correctIndexes)];
    if (unique.length !== correct.correctIndexes.length || unique.some((n) => !inBounds(n))) {
      errors.push(`${context} ${cat} correctIndexes must be unique ints 0..9`);
    }
    return;
  }

  if (cat === 'NUMBER' || cat === 'CENTURY_DECADE' || cat === 'COLOR') {
    if (!inBounds(correct.correctIndex)) {
      errors.push(`${context} ${cat} requires correct.correctIndex (0..9)`);
    }
    return;
  }

  if (cat === 'ORDER') {
    if (!Array.isArray(correct.rankByIndex) || correct.rankByIndex.length !== 10) {
      errors.push(`${context} ORDER requires correct.rankByIndex[10]`);
      return;
    }
    const ranks = correct.rankByIndex;
    const valid = ranks.every((n) => Number.isInteger(n) && n >= 1 && n <= 10);
    if (!valid || new Set(ranks).size !== 10) {
      errors.push(`${context} ORDER rankByIndex must be a permutation of 1..10`);
    }
    return;
  }

  errors.push(`${context} unsupported category ${cat}`);
}

function main() {
  const target = process.argv[2] || 'data/smart10/cards.en.json';
  const { cards, abs } = loadCards(target);

  const errors = [];
  const signatures = new Set();
  const looseSignatures = new Set();
  const byPair = new Map();
  const tfCounts = [];
  const sourceCounts = new Map();

  cards.forEach((card, idx) => {
    const context = `cards[${idx}] id=${card?.id ?? 'missing'}`;

    const required = ['id', 'topic', 'category', 'language', 'question', 'options', 'correct', 'source'];
    for (const field of required) {
      if (card?.[field] === undefined || card?.[field] === null || normalizeText(card[field]) === '') {
        errors.push(`${context} missing required field '${field}'`);
      }
    }

    if (!TOPICS.includes(card.topic)) {
      errors.push(`${context} invalid topic '${card.topic}'`);
    }
    if (!CATEGORIES.includes(card.category)) {
      errors.push(`${context} invalid category '${card.category}'`);
    }
    if (normalizeText(card.language).toLowerCase() !== 'en') {
      errors.push(`${context} language must be 'en' for MVP`);
    }

    if (!Array.isArray(card.options) || card.options.length !== 10) {
      errors.push(`${context} options must contain exactly 10 entries`);
    } else {
      const opts = card.options.map((o) => normalizeText(o));
      if (opts.some((o) => !o)) {
        errors.push(`${context} options contain empty text`);
      }
      if (opts.some((o) => o.length > MAX_OPTION_LEN)) {
        errors.push(`${context} option text exceeds ${MAX_OPTION_LEN} chars`);
      }
      if (new Set(opts.map((o) => o.toLowerCase())).size !== opts.length) {
        errors.push(`${context} duplicate options within card`);
      }
      if (opts.some((o) => /reference table|assigned index/i.test(o))) {
        errors.push(`${context} contains banned nonsense phrase in options`);
      }
    }

    if (/reference table|assigned index|smartiq-factory/i.test(normalizeText(card.question))) {
      errors.push(`${context} contains banned nonsense phrase in question`);
    }

    validateCorrect(card, errors, context);

    if (card.category === 'TRUE_FALSE' && Array.isArray(card.correct?.correctIndexes)) {
      tfCounts.push(card.correct.correctIndexes.length);
    }

    const pairKey = `${card.category}|${card.topic}`;
    byPair.set(pairKey, (byPair.get(pairKey) || 0) + 1);

    const signature = `${normalizeText(card.topic).toLowerCase()}|${normalizeText(card.category)}|${normalizeText(card.question).toLowerCase()}|${(card.options || []).map((o) => normalizeText(o).toLowerCase()).join('|')}`;
    if (signatures.has(signature)) {
      errors.push(`${context} duplicate exact card signature`);
    }
    signatures.add(signature);

    const loose = `${normalizeLoose(card.topic)}|${normalizeLoose(card.category)}|${normalizeLoose(card.question)}|${(card.options || []).map((o) => normalizeLoose(o)).join('|')}`;
    if (looseSignatures.has(loose)) {
      errors.push(`${context} duplicate normalized card signature`);
    }
    looseSignatures.add(loose);

    const source = normalizeText(card.source);
    sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    if (/smartiq-factory|smart10-generator-v1/i.test(source)) {
      errors.push(`${context} source must not be deprecated ('${source}')`);
    }
  });

  for (const category of CATEGORIES) {
    for (const topic of TOPICS) {
      const pairKey = `${category}|${topic}`;
      const count = byPair.get(pairKey) || 0;
      if (count < 30) {
        errors.push(`distribution check failed for ${pairKey}: expected >=30, got ${count}`);
      }
    }
  }

  if (tfCounts.length > 0) {
    const uniqueCounts = new Set(tfCounts);
    if (uniqueCounts.size < 4) {
      errors.push(`TRUE_FALSE sanity failed: low variety of true-counts (${[...uniqueCounts].join(',')})`);
    }
    const tooHigh = tfCounts.filter((n) => n > 7).length;
    if (tooHigh > tfCounts.length * 0.2) {
      errors.push(`TRUE_FALSE sanity failed: too many cards with >7 true statements (${tooHigh}/${tfCounts.length})`);
    }
    const alwaysOne = tfCounts.filter((n) => n === 1).length;
    const alwaysNine = tfCounts.filter((n) => n === 9).length;
    if (alwaysOne > tfCounts.length * 0.3 || alwaysNine > tfCounts.length * 0.1) {
      errors.push(`TRUE_FALSE sanity failed: unbalanced true-count distribution`);
    }
  }

  if (errors.length > 0) {
    console.error(`Validation failed for ${abs}`);
    errors.slice(0, 300).forEach((e) => console.error(`- ${e}`));
    if (errors.length > 300) {
      console.error(`... ${errors.length - 300} more errors`);
    }
    process.exit(1);
  }

  console.log(`Validation passed for ${abs}`);
  console.log(`Total cards: ${cards.length}`);
  console.log('Source distribution:');
  [...sourceCounts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([source, count]) => console.log(`- ${source}: ${count}`));
}

main();
