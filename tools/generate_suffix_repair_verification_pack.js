#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DATE_STAMP = new Date().toISOString().slice(0, 10);
const DEFAULT_REPAIR_COMMIT = '5ec07c7';
const SAMPLE_BUCKETS = [
  ['History', 'NUMBER'],
  ['Sports', 'NUMBER'],
  ['Geography', 'ORDER'],
  ['Culture', 'NUMBER'],
  ['Science', 'ORDER']
];

const LOCALES = [
  {
    code: 'en',
    label: 'EN',
    file: 'data/smart10/cards.en.json',
    suffixRegex: /(Theme:|Context:|Context tag:)/i
  },
  {
    code: 'et',
    label: 'ET',
    file: 'data/smart10/cards.et.json',
    suffixRegex: /(Teema:|Kontekst:)/i
  }
];

function parseArgs(args) {
  const outDirArg = args.find((arg) => arg.startsWith('--out-dir='));
  const repairCommitArg = args.find((arg) => arg.startsWith('--repair-commit='));
  const outDir = outDirArg ? outDirArg.split('=')[1] : 'docs/reports';
  const repairCommit = repairCommitArg ? repairCommitArg.split('=')[1] : DEFAULT_REPAIR_COMMIT;
  return {
    repairCommit,
    markdownPath: path.join(outDir, `${DATE_STAMP}-suffix-repair-verification-pack.md`),
    jsonPath: path.join(outDir, `${DATE_STAMP}-suffix-repair-verification-pack.json`)
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function loadCurrentCards(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), filePath), 'utf8'));
}

function loadCardsBeforeRepair(repairCommit, filePath) {
  return JSON.parse(execFileSync('git', ['show', `${repairCommit}^:${filePath}`], { encoding: 'utf8' }));
}

function selectSamples(localeConfig, repairCommit) {
  const currentCards = loadCurrentCards(localeConfig.file);
  const beforeCards = loadCardsBeforeRepair(repairCommit, localeConfig.file);

  return SAMPLE_BUCKETS.map(([topic, category]) => {
    const sample = currentCards
      .filter((card) => card.topic === topic && card.category === category && card.language === localeConfig.code)
      .map((card) => ({ card, previous: beforeCards.find((item) => item.cardId === card.cardId) }))
      .filter(({ card, previous }) => previous
        && localeConfig.suffixRegex.test(previous.question)
        && !localeConfig.suffixRegex.test(card.question))
      .sort((a, b) => String(a.card.cardId).localeCompare(String(b.card.cardId)))[0];

    if (!sample) {
      throw new Error(`No repaired sample found for ${localeConfig.label} ${topic}/${category}`);
    }

    const suffixMatch = sample.previous.question.match(localeConfig.suffixRegex);
    return {
      locale: localeConfig.label,
      cardId: sample.card.cardId,
      topic: sample.card.topic,
      category: sample.card.category,
      previousSuffixType: suffixMatch ? suffixMatch[1] : 'unknown',
      repairedQuestion: sample.card.question,
      previousQuestion: sample.previous.question,
      reviewOutcome: 'PENDING',
      reviewNote: ''
    };
  });
}

function buildMarkdown(samplesByLocale, repairCommit) {
  const lines = [
    '# Suffix Repair Verification Pack',
    '',
    '## Metadata',
    '',
    `- Date: ${DATE_STAMP}`,
    `- Repair commit: \`${repairCommit}\``,
    '- Scope: targeted manual verification for Theme/Context/Kontekst/Teema suffix cleanup only',
    '- Sample rule: for each locale, use fixed topic/category buckets and pick the first repaired card by `cardId` within each bucket',
    '- Buckets: `History/NUMBER`, `Sports/NUMBER`, `Geography/ORDER`, `Culture/NUMBER`, `Science/ORDER`',
    '- Review outcomes: `PASS`, `PASS_WITH_NOTE`, `NEEDS_REPAIR`',
    '',
    '## Review Scaffold',
    ''
  ];

  for (const [locale, samples] of Object.entries(samplesByLocale)) {
    lines.push(`## ${locale} Sample`, '');
    lines.push('| Card ID | Previous suffix | Topic/Category | Repaired question | Outcome | Note |');
    lines.push('| --- | --- | --- | --- | --- | --- |');
    samples.forEach((sample) => {
      lines.push(`| ${sample.cardId} | ${sample.previousSuffixType} | ${sample.topic}/${sample.category} | ${sample.repairedQuestion} | ${sample.reviewOutcome} | ${sample.reviewNote} |`);
    });
    lines.push('');

    samples.forEach((sample) => {
      lines.push(`### ${sample.cardId}`, '');
      lines.push(`- Locale: \`${sample.locale}\``);
      lines.push(`- Topic/category: \`${sample.topic}/${sample.category}\``);
      lines.push(`- Previous suffix type: \`${sample.previousSuffixType}\``);
      lines.push(`- Previous question: ${sample.previousQuestion}`);
      lines.push(`- Repaired question: ${sample.repairedQuestion}`);
      lines.push(`- Outcome: \`${sample.reviewOutcome}\``);
      lines.push('- Reviewer note:');
      lines.push('');
    });
  }

  return `${lines.join('\n')}\n`;
}

function main() {
  const { repairCommit, markdownPath, jsonPath } = parseArgs(process.argv.slice(2));
  const samplesByLocale = Object.fromEntries(
    LOCALES.map((localeConfig) => [localeConfig.label, selectSamples(localeConfig, repairCommit)])
  );

  ensureDir(markdownPath);
  ensureDir(jsonPath);

  fs.writeFileSync(path.resolve(process.cwd(), markdownPath), buildMarkdown(samplesByLocale, repairCommit), 'utf8');
  fs.writeFileSync(
    path.resolve(process.cwd(), jsonPath),
    JSON.stringify(
      {
        date: DATE_STAMP,
        repairCommit,
        sampleRule: {
          type: 'fixed_bucket_first_card_id',
          buckets: SAMPLE_BUCKETS
        },
        samplesByLocale
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Suffix repair verification pack written: ${path.resolve(process.cwd(), markdownPath)}`);
  console.log(`Suffix repair verification JSON written: ${path.resolve(process.cwd(), jsonPath)}`);
}

if (require.main === module) {
  main();
}
