#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ENGLISH_MARKERS = [
  'focus area',
  'which claims are accurate',
  'mark statements that are true',
  'which statements are true',
  'centered in',
  'began in',
  'ended in',
  'won at',
  'signed in',
  'followed',
  'came before'
];

const ESTONIAN_MARKERS = [
  'fookus',
  'millised vaited',
  'margi selle teema',
  'toesed vaited',
  'oiged',
  'teema',
  'algas',
  'loppes',
  'enne vabariiki',
  'parast'
];

const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'was', 'were', 'is', 'are', 'in', 'of', 'to', 'for', 'with', 'before', 'after',
  'won', 'ended', 'began', 'signed', 'followed', 'centered', 'came', 'true', 'false'
]);

const ESTONIAN_STOPWORDS = new Set([
  'ja', 'on', 'oli', 'olid', 'enne', 'parast', 'teema', 'fookus', 'oiged', 'vaited', 'margi',
  'toene', 'vale', 'algas', 'loppes', 'selle', 'millised'
]);

const PLACEHOLDER_REGEXES = [
  /sample question/i,
  /\boption\s+\d+\b/i,
  /\banswer\s+\d+\b/i,
  /reference table/i,
  /assigned index/i,
  /placeholder/i,
  /\blorem ipsum\b/i,
  /hidden peg/i
];

const TEMPLATE_SCAFFOLD_REGEXES = [
  /focus area:/i,
  /mark statements that are true/i,
  /which claims are accurate/i,
  /which statements are true/i,
  /margi selle teema toesed vaited/i,
  /millised vaited on oiged/i
];

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function normalizeLoose(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value) {
  return normalizeLoose(value).split(' ').filter(Boolean);
}

function parseArgs(args) {
  const inputPath = args.find((arg) => !arg.startsWith('--')) || 'data/smart10/cards.en.json';
  const failThresholdArg = args.find((arg) => arg.startsWith('--fail-threshold='));
  const failThreshold = failThresholdArg ? Number.parseFloat(failThresholdArg.split('=')[1]) : null;
  const maxWarningsArg = args.find((arg) => arg.startsWith('--max-warnings='));
  const maxWarnings = maxWarningsArg ? Number.parseInt(maxWarningsArg.split('=')[1], 10) : 120;
  return { inputPath, failThreshold, maxWarnings };
}

function loadCards(inputPath) {
  const abs = path.resolve(process.cwd(), inputPath);
  const raw = fs.readFileSync(abs, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Dataset must be an array');
  }
  return { abs, cards: parsed };
}

function markerHitCount(text, markers) {
  return markers.reduce((count, marker) => count + (text.includes(marker) ? 1 : 0), 0);
}

function stopwordHitCount(tokens, stopwords) {
  return tokens.reduce((count, token) => count + (stopwords.has(token) ? 1 : 0), 0);
}

function looksLikeOppositeLanguage(text, expectedLanguage) {
  const normalized = normalizeLoose(text);
  const tokens = tokenize(text);
  if (!normalized || tokens.length === 0) {
    return false;
  }

  if (expectedLanguage === 'et') {
    return markerHitCount(normalized, ENGLISH_MARKERS) > 0
      || stopwordHitCount(tokens, ENGLISH_STOPWORDS) >= 2;
  }

  if (expectedLanguage === 'en') {
    return markerHitCount(normalized, ESTONIAN_MARKERS) > 0
      || stopwordHitCount(tokens, ESTONIAN_STOPWORDS) >= 2;
  }

  return false;
}

function hasPlaceholderContent(question, options) {
  const combined = [question, ...options].map((entry) => normalizeText(entry)).join('\n');
  return PLACEHOLDER_REGEXES.some((regex) => regex.test(combined));
}

function hasTemplateScaffold(question) {
  const normalized = normalizeText(question);
  return TEMPLATE_SCAFFOLD_REGEXES.some((regex) => regex.test(normalized));
}

function hasTrivialAnswers(category, options) {
  const normalizedOptions = options.map((entry) => normalizeLoose(entry)).filter(Boolean);
  if (normalizedOptions.length === 0) {
    return false;
  }

  const categoryName = normalizeText(category).toUpperCase();
  const shortCount = normalizedOptions.filter((entry) => entry.length <= 2 && !/^-?\d+(?:\.\d+)?$/.test(entry)).length;
  if (!['NUMBER', 'COLOR'].includes(categoryName) && shortCount >= 4) {
    return true;
  }

  const uniqueRatio = new Set(normalizedOptions).size / normalizedOptions.length;
  if (uniqueRatio < 0.8) {
    return true;
  }

  const averageLength = normalizedOptions.reduce((sum, entry) => sum + entry.length, 0) / normalizedOptions.length;
  return !['NUMBER', 'COLOR'].includes(categoryName) && averageLength < 4;
}

function main() {
  const { inputPath, failThreshold, maxWarnings } = parseArgs(process.argv.slice(2));
  const { abs, cards } = loadCards(inputPath);
  const warnings = [];

  let totalPenalty = 0;
  let totalMaxPenalty = 0;
  let languageLeakageCards = 0;
  let placeholderCards = 0;
  let trivialAnswerCards = 0;
  let scaffoldCards = 0;

  for (const card of cards) {
    const cardId = String(card?.cardId || card?.id || 'unknown').trim();
    const language = String(card?.language || '').trim().toLowerCase() || 'en';
    const question = normalizeText(card?.question);
    const options = Array.isArray(card?.options) ? card.options.map((option) => normalizeText(option?.text ?? option)) : [];

    let cardPenalty = 0;
    let cardMaxPenalty = 0;

    cardMaxPenalty += 1;
    const questionLeakage = looksLikeOppositeLanguage(question, language);
    const leakedOptions = options.filter((option) => looksLikeOppositeLanguage(option, language)).length;
    const optionLeakage = options.length > 0 && leakedOptions >= Math.max(2, Math.ceil(options.length * 0.3));
    if (questionLeakage || optionLeakage) {
      languageLeakageCards += 1;
      cardPenalty += 1;
      warnings.push(`${cardId}: opposite-language leakage detected (question=${questionLeakage}, options=${leakedOptions}/${options.length})`);
    }

    cardMaxPenalty += 1;
    if (hasPlaceholderContent(question, options)) {
      placeholderCards += 1;
      cardPenalty += 1;
      warnings.push(`${cardId}: placeholder-like content detected`);
    }

    cardMaxPenalty += 1;
    if (hasTemplateScaffold(question)) {
      scaffoldCards += 1;
      cardPenalty += 1;
      warnings.push(`${cardId}: template scaffold phrase detected`);
    }

    cardMaxPenalty += 1;
    if (hasTrivialAnswers(card?.category, options)) {
      trivialAnswerCards += 1;
      cardPenalty += 1;
      warnings.push(`${cardId}: trivial or low-information answer set detected`);
    }

    totalPenalty += cardPenalty;
    totalMaxPenalty += cardMaxPenalty;
  }

  const semanticContentScore = Number((1 - totalPenalty / Math.max(1, totalMaxPenalty)).toFixed(3));
  const summary = {
    dataset: abs,
    cards: cards.length,
    semanticContentScore,
    languageLeakageCards,
    placeholderCards,
    scaffoldCards,
    trivialAnswerCards,
    warningCount: warnings.length
  };

  console.log(JSON.stringify(summary, null, 2));
  if (warnings.length > 0) {
    console.log('\nSemantic content warnings:');
    warnings.slice(0, maxWarnings).forEach((warning) => console.log(`- ${warning}`));
    if (warnings.length > maxWarnings) {
      console.log(`- ...and ${warnings.length - maxWarnings} more`);
    }
  }

  if (Number.isFinite(failThreshold) && semanticContentScore < failThreshold) {
    console.error(`\nSemantic content score ${semanticContentScore.toFixed(3)} is below fail-threshold ${failThreshold.toFixed(3)}`);
    process.exit(1);
  }
}

main();
