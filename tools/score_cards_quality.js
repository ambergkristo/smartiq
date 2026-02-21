#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function normalizeLoose(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
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

function toStem(question) {
  const base = normalizeText(question).replace(/\(set\s+\d+\)\s*$/i, '').trim();
  return normalizeLoose(base);
}

function ratio(uniqueCount, totalCount) {
  if (totalCount <= 0) return 0;
  return uniqueCount / totalCount;
}

function main() {
  const args = process.argv.slice(2);
  const inputPathArg = args.find((arg) => !arg.startsWith('--'));
  const inputPath = inputPathArg || 'data/smart10/cards.en.json';
  const failThresholdArg = args.find((arg) => arg.startsWith('--fail-threshold='));
  const failThreshold = failThresholdArg ? Number.parseFloat(failThresholdArg.split('=')[1]) : null;

  const { abs, cards } = loadCards(inputPath);
  const warnings = [];
  const byGroup = new Map();

  for (const card of cards) {
    const topic = normalizeText(card?.topic);
    const category = normalizeText(card?.category);
    const key = `${category}|${topic}`;
    const stem = toStem(card?.question);
    const entry = byGroup.get(key) || { stems: [], optionHashes: [] };
    entry.stems.push(stem);

    const options = Array.isArray(card?.options) ? card.options.map((opt) => normalizeLoose(opt?.text ?? opt)) : [];
    entry.optionHashes.push(options.join('||'));
    byGroup.set(key, entry);
  }

  const groupScores = [];
  for (const [key, value] of byGroup.entries()) {
    const uniqueStems = new Set(value.stems);
    const uniqueOptions = new Set(value.optionHashes);
    const stemRatio = ratio(uniqueStems.size, value.stems.length);
    const optionRatio = ratio(uniqueOptions.size, value.optionHashes.length);
    const score = stemRatio * 0.7 + optionRatio * 0.3;

    if (stemRatio < 0.5) {
      warnings.push(`${key}: low question-stem diversity (${stemRatio.toFixed(3)})`);
    }
    if (optionRatio < 0.7) {
      warnings.push(`${key}: repeated option-set patterns (${optionRatio.toFixed(3)})`);
    }

    groupScores.push({
      group: key,
      count: value.stems.length,
      stemDiversity: Number(stemRatio.toFixed(3)),
      optionSetDiversity: Number(optionRatio.toFixed(3)),
      score: Number(score.toFixed(3))
    });
  }

  groupScores.sort((a, b) => a.score - b.score);
  const overallScore = groupScores.length === 0
    ? 0
    : groupScores.reduce((sum, item) => sum + item.score, 0) / groupScores.length;

  const summary = {
    dataset: abs,
    cards: cards.length,
    groups: groupScores.length,
    overallScore: Number(overallScore.toFixed(3)),
    weakestGroups: groupScores.slice(0, 8),
    warningCount: warnings.length
  };

  console.log(JSON.stringify(summary, null, 2));
  if (warnings.length > 0) {
    console.log('\nQuality warnings:');
    warnings.slice(0, 120).forEach((item) => console.log(`- ${item}`));
    if (warnings.length > 120) {
      console.log(`- ...and ${warnings.length - 120} more`);
    }
  }

  if (failThreshold != null && Number.isFinite(failThreshold) && overallScore < failThreshold) {
    console.error(`\nQuality score ${overallScore.toFixed(3)} is below fail-threshold ${failThreshold.toFixed(3)}`);
    process.exit(1);
  }
}

main();
