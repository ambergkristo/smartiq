#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function normalizeLoose(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
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

function groupKey(card) {
  return `${normalizeText(card?.category)}|${normalizeText(card?.topic)}`;
}

function questionStem(question) {
  const base = normalizeText(question).replace(/\(set\s+\d+\)\s*$/i, '');
  return normalizeLoose(base);
}

function optionsNormalized(card) {
  if (!Array.isArray(card?.options)) {
    return [];
  }
  return card.options.map((entry) => normalizeLoose(entry?.text ?? entry)).filter(Boolean);
}

function main() {
  const { inputPath, failThreshold, maxWarnings } = parseArgs(process.argv.slice(2));
  const { abs, cards } = loadCards(inputPath);

  const warnings = [];
  const placeholderRegexes = [
    /sample question/i,
    /\boption\s+\d+\b/i,
    /reference table/i,
    /assigned index/i,
    /placeholder/i,
    /\blorem ipsum\b/i
  ];

  const byGroup = new Map();
  let cardPenaltySum = 0;
  let cardPenaltyMax = 0;

  for (const card of cards) {
    const question = normalizeText(card?.question);
    const stem = questionStem(question);
    const key = groupKey(card);
    const options = optionsNormalized(card);
    const optionUniqueRatio = options.length === 0 ? 0 : new Set(options).size / options.length;

    const group = byGroup.get(key) || { stems: [] };
    group.stems.push(stem);
    byGroup.set(key, group);

    let penalty = 0;
    let maxPenalty = 0;

    maxPenalty += 1;
    if (question.length < 16) {
      penalty += 1;
      warnings.push(`${key}: short question (${question.length} chars) card=${card?.cardId || card?.id}`);
    }

    maxPenalty += 1;
    if (placeholderRegexes.some((regex) => regex.test(question))) {
      penalty += 1;
      warnings.push(`${key}: placeholder-like question phrase card=${card?.cardId || card?.id}`);
    }

    maxPenalty += 1;
    if (optionUniqueRatio < 0.8) {
      penalty += 1;
      warnings.push(`${key}: low option uniqueness (${optionUniqueRatio.toFixed(2)}) card=${card?.cardId || card?.id}`);
    }

    const averageOptionLength = options.length === 0
      ? 0
      : options.reduce((sum, option) => sum + option.length, 0) / options.length;
    maxPenalty += 1;
    if (averageOptionLength < 4) {
      penalty += 1;
      warnings.push(`${key}: overly terse options (avg ${averageOptionLength.toFixed(1)} chars) card=${card?.cardId || card?.id}`);
    }

    cardPenaltySum += penalty;
    cardPenaltyMax += maxPenalty;
  }

  let groupPenalty = 0;
  let groupPenaltyMax = 0;
  const groupStats = [];
  for (const [key, value] of byGroup.entries()) {
    const total = value.stems.length || 1;
    const uniqueRatio = new Set(value.stems).size / total;
    groupStats.push({
      group: key,
      cards: total,
      stemDiversity: Number(uniqueRatio.toFixed(3))
    });
    groupPenaltyMax += 1;
    if (uniqueRatio < 0.75) {
      groupPenalty += 1;
      warnings.push(`${key}: repeated question stems (${uniqueRatio.toFixed(3)})`);
    }
  }

  groupStats.sort((a, b) => a.stemDiversity - b.stemDiversity);

  const combinedPenalty = cardPenaltySum + groupPenalty;
  const combinedMax = Math.max(1, cardPenaltyMax + groupPenaltyMax);
  const semanticScore = Number((1 - combinedPenalty / combinedMax).toFixed(3));

  const summary = {
    dataset: abs,
    cards: cards.length,
    groups: groupStats.length,
    semanticScore,
    weakestGroups: groupStats.slice(0, 8),
    warningCount: warnings.length
  };

  console.log(JSON.stringify(summary, null, 2));
  if (warnings.length > 0) {
    console.log('\nSemantic warnings:');
    warnings.slice(0, maxWarnings).forEach((warning) => console.log(`- ${warning}`));
    if (warnings.length > maxWarnings) {
      console.log(`- ...and ${warnings.length - maxWarnings} more`);
    }
  }

  if (Number.isFinite(failThreshold) && semanticScore < failThreshold) {
    console.error(`\nSemantic score ${semanticScore.toFixed(3)} is below fail-threshold ${failThreshold.toFixed(3)}`);
    process.exit(1);
  }
}

main();
