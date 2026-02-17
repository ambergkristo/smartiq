#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');
}

function jaccard(a, b) {
  const sa = new Set(normalize(a).split(' ').filter(Boolean));
  const sb = new Set(normalize(b).split(' ').filter(Boolean));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const token of sa) if (sb.has(token)) inter += 1;
  return inter / (sa.size + sb.size - inter);
}

function readJsonArray(file) {
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Array.isArray(parsed) ? parsed : [];
}

function main() {
  const inputFile = process.argv[2] || 'data/raw/generated.latest.raw.json';
  const absoluteInput = path.resolve(process.cwd(), inputFile);
  const reviewDir = path.resolve(process.cwd(), 'data/review');
  if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });

  if (!fs.existsSync(absoluteInput)) {
    console.error(`Input file not found: ${absoluteInput}`);
    process.exit(1);
  }

  const cards = readJsonArray(absoluteInput);
  const flagged = [];
  const duplicates = [];
  const approved = [];
  const seenQuestionByKey = new Map();

  for (const card of cards) {
    const reasons = [];

    const q = normalize(card.question);
    const key = `${normalize(card.topic)}|${normalize(card.difficulty)}|${normalize(card.language)}`;

    if (q.length < 20) reasons.push('question_too_short');

    if (Array.isArray(card.options)) {
      const normalizedOptions = card.options.map(normalize);
      if (new Set(normalizedOptions).size < normalizedOptions.length) {
        reasons.push('duplicate_options');
        duplicates.push({ id: card.id, type: 'duplicate_options', score: 1.0 });
      }
    } else {
      reasons.push('missing_options_array');
    }

    const prior = seenQuestionByKey.get(key) || [];
    for (const previousQuestion of prior) {
      const score = jaccard(q, previousQuestion);
      if (score >= 0.9) {
        reasons.push('too_similar_to_existing_question');
        duplicates.push({ id: card.id, type: 'near_duplicate_question', score });
        break;
      }
    }
    prior.push(q);
    seenQuestionByKey.set(key, prior);

    if (reasons.length > 0) {
      flagged.push({ id: card.id, reasons, card });
    } else {
      approved.push(card);
    }
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const flaggedFile = path.join(reviewDir, `flagged.${stamp}.json`);
  const duplicatesFile = path.join(reviewDir, `duplicates.${stamp}.json`);
  const approvedFile = path.join(reviewDir, `approved.${stamp}.json`);
  const reportFile = path.join(reviewDir, `report.${stamp}.json`);
  const latestDuplicatesFile = path.join(reviewDir, 'duplicates.latest.json');
  const latestReportFile = path.join(reviewDir, 'report.latest.json');

  fs.writeFileSync(flaggedFile, `${JSON.stringify(flagged, null, 2)}\n`, 'utf8');
  fs.writeFileSync(duplicatesFile, `${JSON.stringify(duplicates, null, 2)}\n`, 'utf8');
  fs.writeFileSync(approvedFile, `${JSON.stringify(approved, null, 2)}\n`, 'utf8');
  const reportPayload = {
    inputFile: path.relative(process.cwd(), absoluteInput),
    total: cards.length,
    approved: approved.length,
    flagged: flagged.length,
    duplicates: duplicates.length,
    generatedAt: new Date().toISOString()
  };
  fs.writeFileSync(reportFile, `${JSON.stringify(reportPayload, null, 2)}\n`, 'utf8');
  fs.copyFileSync(duplicatesFile, latestDuplicatesFile);
  fs.copyFileSync(reportFile, latestReportFile);

  console.log(`Review complete. Approved: ${approved.length}, Flagged: ${flagged.length}`);
  console.log(`- ${path.relative(process.cwd(), approvedFile)}`);
  console.log(`- ${path.relative(process.cwd(), flaggedFile)}`);
  console.log(`- ${path.relative(process.cwd(), duplicatesFile)}`);
  console.log(`- ${path.relative(process.cwd(), reportFile)}`);
  console.log(`- ${path.relative(process.cwd(), latestDuplicatesFile)}`);
  console.log(`- ${path.relative(process.cwd(), latestReportFile)}`);
}

main();
