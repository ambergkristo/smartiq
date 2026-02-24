#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_DATASETS = [
  'data/smart10/cards.en.json',
  'data/smart10/cards.et.json'
];

const DEFAULT_MIN_CATEGORY_SCORE = {
  NUMBER: 0.90,
  COLOR: 0.95
};

const DEFAULT_MAX_SHORT_OPTION_RATIO = {
  NUMBER: 0.40,
  COLOR: 0.10
};

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function parseMetricMap(raw, optionName) {
  const map = {};
  if (!raw) {
    return map;
  }
  const entries = raw.split(',').map((part) => part.trim()).filter(Boolean);
  for (const entry of entries) {
    const [key, value] = entry.split(':');
    if (!key || value == null) {
      throw new Error(`Invalid ${optionName} entry: ${entry}`);
    }
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric ${optionName} value for ${key}: ${value}`);
    }
    map[key.trim().toUpperCase()] = parsed;
  }
  return map;
}

function parseFirstJsonObject(output) {
  const start = output.indexOf('{');
  if (start < 0) {
    throw new Error('Semantic scorer output does not contain JSON.');
  }
  let depth = 0;
  let end = -1;
  for (let idx = start; idx < output.length; idx += 1) {
    const ch = output[idx];
    if (ch === '{') {
      depth += 1;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = idx;
        break;
      }
    }
  }
  if (end < 0) {
    throw new Error('Could not parse semantic scorer JSON payload.');
  }
  return JSON.parse(output.slice(start, end + 1));
}

function runSemanticSummary(datasetPath) {
  const semanticScript = path.resolve(__dirname, 'score_cards_semantic.js');
  const result = spawnSync(
    process.execPath,
    [semanticScript, datasetPath, '--max-warnings=0'],
    { encoding: 'utf8' }
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const details = String(result.stderr || result.stdout || '').trim();
    throw new Error(`Semantic scorer failed for ${datasetPath}: ${details}`);
  }
  return parseFirstJsonObject(String(result.stdout || ''));
}

function detectLocale(datasetPath) {
  const file = path.basename(datasetPath);
  const match = file.match(/\.([a-z]{2})\.json$/i);
  return match ? match[1].toUpperCase() : file;
}

function pct(value) {
  if (!Number.isFinite(value)) {
    return 'n/a';
  }
  return `${(value * 100).toFixed(2)}%`;
}

function appendSummary(markdown) {
  const target = process.env.GITHUB_STEP_SUMMARY;
  if (!target) {
    return;
  }
  fs.appendFileSync(target, `${markdown}\n`, 'utf8');
}

function main() {
  const args = process.argv.slice(2);
  const failOnExceed = args.includes('--fail-on-exceed')
    || String(process.env.SEMANTIC_PARITY_FAIL_ON_EXCEED || '').toLowerCase() === 'true';
  const maxLocaleScoreGap = Number.parseFloat(parseArg(args, '--max-locale-score-gap=')) || 0.02;
  const maxLocaleWarningGap = Number.parseInt(parseArg(args, '--max-locale-warning-gap='), 10) || 10;
  const minCategoryScore = {
    ...DEFAULT_MIN_CATEGORY_SCORE,
    ...parseMetricMap(parseArg(args, '--min-category-score='), '--min-category-score')
  };
  const maxShortOptionRatio = {
    ...DEFAULT_MAX_SHORT_OPTION_RATIO,
    ...parseMetricMap(parseArg(args, '--max-short-option-ratio='), '--max-short-option-ratio')
  };
  const datasets = args.filter((arg) => !arg.startsWith('--'));
  const selectedDatasets = datasets.length > 0 ? datasets : DEFAULT_DATASETS;

  const localeSummaries = selectedDatasets.map((datasetPath) => {
    const summary = runSemanticSummary(datasetPath);
    return {
      locale: detectLocale(datasetPath),
      datasetPath,
      summary
    };
  });

  const checks = [];
  const semanticScores = localeSummaries.map((row) => Number(row.summary.semanticScore || 0));
  const warningCounts = localeSummaries.map((row) => Number(row.summary.warningCount || 0));
  const scoreGap = Math.max(...semanticScores) - Math.min(...semanticScores);
  const warningGap = Math.max(...warningCounts) - Math.min(...warningCounts);

  checks.push({
    check: 'Locale semantic score gap',
    pass: scoreGap <= maxLocaleScoreGap,
    actual: scoreGap.toFixed(3),
    threshold: `<= ${maxLocaleScoreGap.toFixed(3)}`
  });
  checks.push({
    check: 'Locale warning count gap',
    pass: warningGap <= maxLocaleWarningGap,
    actual: String(warningGap),
    threshold: `<= ${maxLocaleWarningGap}`
  });

  for (const row of localeSummaries) {
    const categoryStats = row.summary.categoryStats || {};
    for (const [category, floor] of Object.entries(minCategoryScore)) {
      const actual = Number(categoryStats[category]?.semanticScore);
      checks.push({
        check: `${row.locale} ${category} semantic score`,
        pass: Number.isFinite(actual) && actual >= floor,
        actual: Number.isFinite(actual) ? actual.toFixed(3) : 'n/a',
        threshold: `>= ${floor.toFixed(3)}`
      });
    }
    for (const [category, cap] of Object.entries(maxShortOptionRatio)) {
      const actual = Number(categoryStats[category]?.shortOptionRatio);
      checks.push({
        check: `${row.locale} ${category} short-option ratio`,
        pass: Number.isFinite(actual) && actual <= cap,
        actual: Number.isFinite(actual) ? pct(actual) : 'n/a',
        threshold: `<= ${pct(cap)}`
      });
    }
  }

  const failedChecks = checks.filter((entry) => !entry.pass);
  const modeText = failOnExceed ? 'fail-on-exceed (blocking)' : 'warning-only (non-blocking)';

  const lines = [];
  lines.push('## Semantic Locale Parity');
  lines.push('');
  lines.push(`- Mode: ${modeText}`);
  lines.push(`- Max locale semantic score gap: ${maxLocaleScoreGap.toFixed(3)}`);
  lines.push(`- Max locale warning gap: ${maxLocaleWarningGap}`);
  lines.push('');
  lines.push('| Locale | Semantic score | Warnings |');
  lines.push('| --- | ---: | ---: |');
  for (const row of localeSummaries) {
    lines.push(`| ${row.locale} | ${Number(row.summary.semanticScore || 0).toFixed(3)} | ${Number(row.summary.warningCount || 0)} |`);
  }
  lines.push('');
  lines.push('| Check | Result | Actual | Threshold |');
  lines.push('| --- | --- | --- | --- |');
  for (const check of checks) {
    lines.push(`| ${check.check} | ${check.pass ? 'PASS' : 'WARN'} | ${check.actual} | ${check.threshold} |`);
  }
  lines.push('');
  if (failedChecks.length === 0) {
    lines.push('- Result: parity checks within configured limits.');
  } else if (failOnExceed) {
    lines.push(`- Result: ${failedChecks.length} check(s) out of limits (blocking mode).`);
  } else {
    lines.push(`- Result: ${failedChecks.length} check(s) out of limits (warning-only).`);
  }

  const markdown = `${lines.join('\n')}\n`;
  process.stdout.write(`${markdown}\n`);
  appendSummary(markdown);

  if (failOnExceed && failedChecks.length > 0) {
    process.exit(2);
  }
}

try {
  main();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.error(message);
  process.exit(1);
}
