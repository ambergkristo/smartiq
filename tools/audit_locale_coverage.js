#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOPICS = ['History', 'Sports', 'Geography', 'Culture', 'Science', 'Varia'];
const CATEGORIES = ['TRUE_FALSE', 'NUMBER', 'ORDER', 'CENTURY_DECADE', 'COLOR', 'OPEN'];

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    dataDir: 'data/smart10',
    required: ['en', 'et'],
    minPerCombo: 30
  };

  if (args[0] && !args[0].startsWith('--')) {
    config.dataDir = args[0];
  }

  for (const arg of args) {
    if (arg.startsWith('--required=')) {
      const locales = arg.split('=')[1] || '';
      config.required = locales
        .split(',')
        .map((entry) => normalizeText(entry).toLowerCase())
        .filter(Boolean);
    } else if (arg.startsWith('--min-per-combo=')) {
      const parsed = Number.parseInt(arg.split('=')[1], 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        config.minPerCombo = parsed;
      }
    }
  }

  return config;
}

function loadCards(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset must be an array: ${filePath}`);
  }
  return parsed;
}

function comboKey(category, topic) {
  return `${category}|${topic}`;
}

function emptyComboMap() {
  const map = new Map();
  for (const category of CATEGORIES) {
    for (const topic of TOPICS) {
      map.set(comboKey(category, topic), 0);
    }
  }
  return map;
}

function countCombos(cards) {
  const combos = emptyComboMap();
  for (const card of cards) {
    const category = normalizeText(card?.category);
    const topic = normalizeText(card?.topic);
    const key = comboKey(category, topic);
    if (combos.has(key)) {
      combos.set(key, (combos.get(key) || 0) + 1);
    }
  }
  return combos;
}

function listLocaleFiles(dataDir) {
  return fs.readdirSync(dataDir)
    .filter((name) => /^cards\.[a-z]{2}\.json$/i.test(name))
    .sort((a, b) => a.localeCompare(b));
}

function main() {
  const { dataDir, required, minPerCombo } = parseArgs();
  const absDir = path.resolve(process.cwd(), dataDir);

  if (!fs.existsSync(absDir)) {
    console.error(`Data directory not found: ${absDir}`);
    process.exit(1);
  }

  const localeFiles = listLocaleFiles(absDir);
  if (localeFiles.length === 0) {
    console.error(`No locale files found under ${absDir} (expected cards.<lang>.json).`);
    process.exit(1);
  }

  const foundLocales = localeFiles.map((file) => normalizeText(file.split('.')[1]).toLowerCase());
  const missingRequired = required.filter((locale) => !foundLocales.includes(locale));
  if (missingRequired.length > 0) {
    console.error(`Missing required locales: ${missingRequired.join(', ')}`);
    process.exit(1);
  }

  const violations = [];
  const summary = {};

  for (const fileName of localeFiles) {
    const locale = normalizeText(fileName.split('.')[1]).toLowerCase();
    const filePath = path.join(absDir, fileName);
    const cards = loadCards(filePath);
    const combos = countCombos(cards);

    const byCategory = {};
    for (const category of CATEGORIES) {
      byCategory[category] = TOPICS.reduce((sum, topic) => {
        return sum + (combos.get(comboKey(category, topic)) || 0);
      }, 0);
    }

    const lowCombos = [];
    for (const category of CATEGORIES) {
      for (const topic of TOPICS) {
        const key = comboKey(category, topic);
        const count = combos.get(key) || 0;
        if (count < minPerCombo) {
          lowCombos.push({ category, topic, count });
          violations.push(`[${locale}] ${category}|${topic} has ${count}, required >=${minPerCombo}`);
        }
      }
    }

    summary[locale] = {
      cards: cards.length,
      byCategory,
      lowComboCount: lowCombos.length,
      lowCombos: lowCombos.slice(0, 12)
    };
  }

  console.log(JSON.stringify({
    dataDir: absDir,
    requiredLocales: required,
    foundLocales,
    minPerCombo,
    summary
  }, null, 2));

  if (violations.length > 0) {
    console.error('\nCoverage violations:');
    violations.slice(0, 120).forEach((entry) => console.error(`- ${entry}`));
    if (violations.length > 120) {
      console.error(`- ...and ${violations.length - 120} more`);
    }
    process.exit(1);
  }

  console.log('\nLocale coverage audit passed.');
}

main();
