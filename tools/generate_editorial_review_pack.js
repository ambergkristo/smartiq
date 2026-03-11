#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const SAMPLE_SEED = 'smartiq-sprint-2.5-editorial-review';
const DATE_STAMP = new Date().toISOString().slice(0, 10);

const LOCALES = [
  { code: 'en', label: 'EN', file: 'data/smart10/cards.en.json' },
  { code: 'et', label: 'ET', file: 'data/smart10/cards.et.json' }
];

const PRIORITY_OPEN_TOPICS = ['Sports', 'Geography', 'Culture', 'Science', 'Varia'];
const CROSS_CATEGORY_COMBOS = [
  { topic: 'History', category: 'TRUE_FALSE' },
  { topic: 'Sports', category: 'NUMBER' },
  { topic: 'Geography', category: 'ORDER' },
  { topic: 'Culture', category: 'CENTURY_DECADE' },
  { topic: 'Science', category: 'COLOR' }
];

function parseArgs(args) {
  const outDirArg = args.find((arg) => arg.startsWith('--out-dir='));
  const outDir = outDirArg
    ? outDirArg.split('=')[1]
    : 'docs/reports';

  return {
    reviewSetPath: path.join(outDir, `${DATE_STAMP}-editorial-review-set.md`),
    reviewSetJsonPath: path.join(outDir, `${DATE_STAMP}-editorial-review-set.json`),
    spotCheckPath: path.join(outDir, `${DATE_STAMP}-editorial-spot-check.md`)
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadCards(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  const cards = JSON.parse(fs.readFileSync(abs, 'utf8'));
  if (!Array.isArray(cards)) {
    throw new Error(`Dataset must be an array: ${filePath}`);
  }
  return cards;
}

function stableHash(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function byCardId(a, b) {
  return String(a.id || '').localeCompare(String(b.id || ''));
}

function toOptionText(option) {
  if (option && typeof option === 'object' && 'text' in option) {
    return String(option.text || '').trim();
  }
  return String(option || '').trim();
}

function formatCorrect(card) {
  if (card.category === 'TRUE_FALSE' || card.category === 'OPEN') {
    const indexes = Array.isArray(card.correct?.correctIndexes) ? card.correct.correctIndexes : [];
    return indexes.length > 0 ? indexes.join(', ') : 'n/a';
  }
  if (card.category === 'ORDER') {
    const ranks = Array.isArray(card.correct?.rankByIndex)
      ? card.correct.rankByIndex
      : Array.isArray(card.correct?.correctOrder)
        ? card.correct.correctOrder
        : [];
    return ranks.length === 10 ? ranks.join(', ') : 'n/a';
  }
  if (Number.isInteger(card.correct?.correctIndex)) {
    return String(card.correct.correctIndex);
  }
  return 'n/a';
}

function sampleForCombo(cards, localeCode, topic, category) {
  const group = cards
    .filter((card) => card.topic === topic && card.category === category && card.language === localeCode)
    .sort(byCardId);

  if (group.length === 0) {
    throw new Error(`Missing cards for ${localeCode} ${topic}/${category}`);
  }

  const index = stableHash(`${SAMPLE_SEED}|${localeCode}|${topic}|${category}`) % group.length;
  return group[index];
}

function buildSamples(localeConfig) {
  const cards = loadCards(localeConfig.file);
  const entries = [];

  PRIORITY_OPEN_TOPICS.forEach((topic) => {
    entries.push({
      bucket: 'priority_open',
      card: sampleForCombo(cards, localeConfig.code, topic, 'OPEN')
    });
  });

  CROSS_CATEGORY_COMBOS.forEach(({ topic, category }) => {
    entries.push({
      bucket: 'cross_category',
      card: sampleForCombo(cards, localeConfig.code, topic, category)
    });
  });

  return entries.map((entry, index) => ({
    sampleKey: `${localeConfig.label}-${String(index + 1).padStart(2, '0')}`,
    bucket: entry.bucket,
    locale: localeConfig.label,
    cardId: entry.card.id,
    topic: entry.card.topic,
    category: entry.card.category,
    question: entry.card.question,
    options: entry.card.options.map(toOptionText),
    correct: formatCorrect(entry.card)
  }));
}

function buildReviewSetMarkdown(samplesByLocale, spotCheckPath) {
  const sections = [
    '# Editorial Review Set',
    '',
    '## Metadata',
    '',
    `- Date: ${DATE_STAMP}`,
    `- Seed: \`${SAMPLE_SEED}\``,
    `- Spot-check report: \`${spotCheckPath}\``,
    '',
    '## Sampling Method',
    '',
    '- Deterministic selection only; no random picks after generation.',
    '- Per locale, sample 10 cards.',
    '- Coverage includes all previously highest-risk repaired `OPEN` areas: `Sports`, `Geography`, `Culture`, `Science`, `Varia`.',
    '- Coverage also includes one card from each non-OPEN category family: `TRUE_FALSE`, `NUMBER`, `ORDER`, `CENTURY_DECADE`, `COLOR`.',
    '- Selection rule: sort matching cards by `id`, then pick `hash(seed|locale|topic|category) mod count`.',
    ''
  ];

  for (const [localeLabel, samples] of Object.entries(samplesByLocale)) {
    sections.push(`## ${localeLabel} Sample`, '');
    samples.forEach((sample) => {
      sections.push(`### ${sample.sampleKey}`, '');
      sections.push(`- Bucket: \`${sample.bucket}\``);
      sections.push(`- Card: \`${sample.cardId}\``);
      sections.push(`- Topic/category: \`${sample.topic}/${sample.category}\``);
      sections.push(`- Question: ${sample.question}`);
      sections.push(`- Expected correct: \`${sample.correct}\``);
      sections.push('');
      sections.push('Options:');
      sample.options.forEach((option, index) => {
        sections.push(`${index}. ${option}`);
      });
      sections.push('');
    });
  }

  return `${sections.join('\n')}\n`;
}

function buildSpotCheckMarkdown(samplesByLocale, reviewSetPath) {
  const rows = [];
  Object.values(samplesByLocale).forEach((samples) => {
    samples.forEach((sample) => {
      rows.push(`| ${sample.locale} | ${sample.sampleKey} | ${sample.cardId} | ${sample.topic}/${sample.category} | PENDING | |`);
    });
  });

  return `# Editorial Spot-Check Report

## Metadata

- Date: ${DATE_STAMP}
- Review set: \`${reviewSetPath}\`
- Checklist: \`docs/editorial-spot-check-checklist.md\`
- Workflow: \`docs/editorial-spot-check-workflow.md\`

## Status

- Validator-clean status: PASS
- EN spot-check status: PENDING
- ET spot-check status: PENDING
- EN launch-trust status: CONDITIONAL - editorial verification pending
- ET launch-trust status: CONDITIONAL - editorial verification pending

## Outcome Legend

- \`PASS\`
- \`PASS_WITH_NOTE\`
- \`NEEDS_REPAIR\`

## Results

| Locale | Sample | Card ID | Topic/Category | Outcome | Reviewer note |
| --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

## Reviewer Summary

- EN reviewer:
- ET reviewer:
- EN notes:
- ET notes:
- Repair follow-up:
`;
}

function main() {
  const { reviewSetPath, reviewSetJsonPath, spotCheckPath } = parseArgs(process.argv.slice(2));
  const samplesByLocale = Object.fromEntries(
    LOCALES.map((localeConfig) => [localeConfig.label, buildSamples(localeConfig)])
  );

  ensureDir(reviewSetPath);
  ensureDir(reviewSetJsonPath);
  ensureDir(spotCheckPath);

  fs.writeFileSync(
    path.resolve(process.cwd(), reviewSetPath),
    buildReviewSetMarkdown(samplesByLocale, spotCheckPath),
    'utf8'
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), reviewSetJsonPath),
    JSON.stringify({
      date: DATE_STAMP,
      seed: SAMPLE_SEED,
      samplesByLocale
    }, null, 2),
    'utf8'
  );
  fs.writeFileSync(
    path.resolve(process.cwd(), spotCheckPath),
    buildSpotCheckMarkdown(samplesByLocale, reviewSetPath),
    'utf8'
  );

  console.log(`Editorial review set written: ${path.resolve(process.cwd(), reviewSetPath)}`);
  console.log(`Editorial review JSON written: ${path.resolve(process.cwd(), reviewSetJsonPath)}`);
  console.log(`Editorial spot-check report written: ${path.resolve(process.cwd(), spotCheckPath)}`);
}

if (require.main === module) {
  main();
}
