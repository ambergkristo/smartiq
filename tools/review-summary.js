#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const reviewDir = path.resolve(process.cwd(), 'data', 'review');
  const reportPath = path.join(reviewDir, 'report.latest.json');
  const duplicatesPath = path.join(reviewDir, 'duplicates.latest.json');

  if (!fs.existsSync(reportPath)) {
    console.error(`Missing review report artifact: ${path.relative(process.cwd(), reportPath)}`);
    process.exit(1);
  }

  if (!fs.existsSync(duplicatesPath)) {
    console.error(`Missing duplicates artifact: ${path.relative(process.cwd(), duplicatesPath)}`);
    process.exit(1);
  }

  const report = readJson(reportPath);
  const duplicates = readJson(duplicatesPath);
  const duplicateCount = Array.isArray(duplicates) ? duplicates.length : 0;

  const lines = [
    '## Review Artifacts',
    `- report: \`${path.relative(process.cwd(), reportPath)}\``,
    `- duplicates: \`${path.relative(process.cwd(), duplicatesPath)}\``,
    `- input: \`${report.inputFile || 'unknown'}\``,
    `- totals: approved=${report.approved ?? 0}, flagged=${report.flagged ?? 0}, duplicates=${duplicateCount}`
  ];

  console.log(lines.join('\n'));
}

main();
