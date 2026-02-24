#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_DATASETS = [
  'data/smart10/cards.en.json',
  'data/smart10/cards.et.json'
];

function parseArgs(argv) {
  const maxWarningsArg = argv.find((arg) => arg.startsWith('--max-warnings='));
  const failOnExceed = argv.includes('--fail-on-exceed')
    || String(process.env.SEMANTIC_WARNING_BUDGET_FAIL_ON_EXCEED || '').toLowerCase() === 'true';
  const datasets = argv.filter((arg) => !arg.startsWith('--'));

  const maxWarnings = maxWarningsArg
    ? Number.parseInt(maxWarningsArg.split('=')[1], 10)
    : 80;

  if (!Number.isFinite(maxWarnings) || maxWarnings < 0) {
    throw new Error(`Invalid --max-warnings value: ${maxWarningsArg}`);
  }

  return {
    maxWarnings,
    failOnExceed,
    datasets: datasets.length > 0 ? datasets : DEFAULT_DATASETS
  };
}

function parseFirstJsonObject(output) {
  const start = output.indexOf('{');
  if (start < 0) {
    throw new Error('Semantic output does not contain JSON summary.');
  }

  let depth = 0;
  let end = -1;
  for (let idx = start; idx < output.length; idx += 1) {
    const char = output[idx];
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = idx;
        break;
      }
    }
  }

  if (end < 0) {
    throw new Error('Could not parse semantic JSON summary bounds.');
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
    const stderr = String(result.stderr || '').trim();
    const stdout = String(result.stdout || '').trim();
    throw new Error(
      `Semantic scorer failed for ${datasetPath} (status ${result.status}).\n${stderr || stdout}`
    );
  }

  const summary = parseFirstJsonObject(String(result.stdout || ''));
  return {
    datasetPath,
    summary
  };
}

function summarizeLocale(datasetPath) {
  const name = path.basename(datasetPath);
  const match = name.match(/\.([a-z]{2})\.json$/i);
  if (match) {
    return match[1].toUpperCase();
  }
  return name;
}

function buildReportLines(results, maxWarnings, failOnExceed) {
  const lines = [];
  lines.push('## Semantic Warning Budget');
  lines.push('');
  lines.push(`- Budget per locale: <= ${maxWarnings} warnings`);
  lines.push(`- Mode: ${failOnExceed ? 'fail-on-exceed (blocking)' : 'warning-only (non-blocking)'}`);
  lines.push('');
  lines.push('| Locale | Semantic score | Warnings | Budget | Status |');
  lines.push('| --- | ---: | ---: | ---: | --- |');

  let overBudgetCount = 0;
  for (const result of results) {
    const locale = summarizeLocale(result.datasetPath);
    const semanticScore = Number(result.summary.semanticScore ?? 0).toFixed(3);
    const warningCount = Number(result.summary.warningCount ?? 0);
    const overBy = Math.max(0, warningCount - maxWarnings);
    if (overBy > 0) {
      overBudgetCount += 1;
    }

    const status = overBy > 0 ? `WARN (+${overBy})` : 'PASS';
    lines.push(`| ${locale} | ${semanticScore} | ${warningCount} | ${maxWarnings} | ${status} |`);
  }

  lines.push('');
  if (overBudgetCount === 0) {
    lines.push('- Result: within warning budget.');
  } else {
    if (failOnExceed) {
      lines.push(`- Result: ${overBudgetCount}/${results.length} locale(s) over budget (will fail in blocking mode).`);
    } else {
      lines.push(`- Result: ${overBudgetCount}/${results.length} locale(s) over budget (non-blocking).`);
    }
  }

  return {
    lines,
    overBudgetCount
  };
}

function appendGithubSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) {
    return;
  }
  fs.appendFileSync(summaryFile, `${markdown}\n`, 'utf8');
}

function main() {
  const { maxWarnings, failOnExceed, datasets } = parseArgs(process.argv.slice(2));
  const results = datasets.map((datasetPath) => runSemanticSummary(datasetPath));

  const { lines, overBudgetCount } = buildReportLines(results, maxWarnings, failOnExceed);
  const markdown = `${lines.join('\n')}\n`;

  process.stdout.write(`${markdown}\n`);
  appendGithubSummary(markdown);

  if (failOnExceed && overBudgetCount > 0) {
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
