#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { analyzeCards, loadCards, normalizeText } = require('./semantic_content_validator');

const LOCALES = [
  { code: 'en', file: 'data/smart10/cards.en.json', label: 'EN' },
  { code: 'et', file: 'data/smart10/cards.et.json', label: 'ET' }
];

const ISSUE_LABELS = {
  language_leakage: 'language leakage',
  broken_grammar: 'broken grammar',
  unnatural_phrasing: 'unnatural phrasing',
  template_scaffold: 'templated/scaffold wording',
  placeholder_content: 'placeholder content',
  recycled_option_pool: 'recycled option pool',
  low_trust_option: 'low-trust option wording',
  trivial_answers: 'trivial/low-value content'
};

const ISSUE_COUNT_LABELS = {
  languageLeakageCards: 'language leakage',
  brokenGrammarCards: 'broken grammar',
  unnaturalPhrasingCards: 'unnatural phrasing',
  placeholderCards: 'placeholder content',
  scaffoldCards: 'templated/scaffold wording',
  recycledOptionCards: 'recycled option pool',
  lowTrustOptionCards: 'low-trust option wording',
  trivialAnswerCards: 'trivial/low-value content'
};

function parseArgs(args) {
  const outArg = args.find((arg) => arg.startsWith('--out='));
  return {
    outPath: outArg
      ? outArg.split('=')[1]
      : `docs/reports/${new Date().toISOString().slice(0, 10)}-content-truth-audit.md`
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function formatReadiness(summary, locale) {
  if (locale === 'et') {
    return 'BLOCKED - ET is not launch-ready';
  }
  if (summary.semanticContentScore >= 0.95 && summary.issueCounts.languageLeakageCards === 0 && summary.issueCounts.brokenGrammarCards === 0) {
    return 'CONDITIONAL - editorial cleanup still required';
  }
  return 'NOT READY - editorial cleanup required before launch trust';
}

function topExamples(cardFindings, issueType, limit = 5) {
  return cardFindings
    .filter((entry) => entry.issues.some((issue) => issue.type === issueType))
    .slice(0, limit)
    .map((entry) => `- \`${entry.cardId}\` ${entry.topic}/${entry.category}: ${normalizeText(entry.question)}`);
}

function highestRiskAreaLine(area) {
  return `- ${area.locale.toUpperCase()} ${area.topic}/${area.category}: ${area.issueCards}/${area.cards} cards flagged (${Math.round(area.issueRate * 100)}%) | ${area.topIssues.join(', ') || 'n/a'}`;
}

function summarizeLocale(localeConfig) {
  const { abs, cards } = loadCards(localeConfig.file);
  const result = analyzeCards(cards, abs);
  return {
    ...localeConfig,
    result
  };
}

function issueTotal(summary) {
  return Object.values(summary.issueCounts).reduce((sum, value) => sum + Number(value || 0), 0);
}

function buildReport(localeSummaries) {
  const generatedAt = new Date().toISOString();
  const sections = [
    '# Content Truth Audit',
    '',
    '## Metadata',
    '',
    `- Generated: ${generatedAt}`,
    `- Scope: ${localeSummaries.map((entry) => entry.label).join(', ')} SmartIQ locale packs`,
    '',
    '## Executive Summary',
    ''
  ];

  for (const locale of localeSummaries) {
    const summary = locale.result.summary;
    sections.push(`- ${locale.label}: ${formatReadiness(summary, locale.code)} | score ${summary.semanticContentScore.toFixed(3)} | total issues ${issueTotal(summary)}`);
  }

  for (const locale of localeSummaries) {
    const summary = locale.result.summary;
    sections.push('', `## ${locale.label} Findings`, '');
    sections.push(`- Dataset: \`${locale.file}\``);
    sections.push(`- Semantic content score: ${summary.semanticContentScore.toFixed(3)}`);
    sections.push(`- Launch readiness: ${formatReadiness(summary, locale.code)}`);
    sections.push(`- Total issue hits: ${issueTotal(summary)}`);
    sections.push(`- Warning count: ${summary.warningCount}`);
    sections.push('');
    sections.push('### Issue Counts', '');
    Object.entries(summary.issueCounts).forEach(([key, value]) => {
      const label = ISSUE_COUNT_LABELS[key] || key;
      sections.push(`- ${label}: ${value}`);
    });
    sections.push('', '### Highest-Risk Areas', '');
    summary.highestRiskAreas.slice(0, 6).forEach((area) => sections.push(highestRiskAreaLine(area)));
    sections.push('', '### Categorized Findings Summary', '');

    [
      'language_leakage',
      'broken_grammar',
      'unnatural_phrasing',
      'template_scaffold',
      'trivial_answers',
      'low_trust_option',
      'recycled_option_pool'
    ].forEach((issueType) => {
      const examples = topExamples(locale.result.cardFindings, issueType, 4);
      if (examples.length === 0) {
        return;
      }
      sections.push(`#### ${ISSUE_LABELS[issueType]}`, '');
      sections.push(...examples);
      sections.push('');
    });
  }

  return `${sections.join('\n')}\n`;
}

function main() {
  const { outPath } = parseArgs(process.argv.slice(2));
  const localeSummaries = LOCALES.map(summarizeLocale);
  const report = buildReport(localeSummaries);
  const absOutPath = path.resolve(process.cwd(), outPath);
  ensureDir(absOutPath);
  fs.writeFileSync(absOutPath, report, 'utf8');
  console.log(`Content truth report written: ${absOutPath}`);
}

if (require.main === module) {
  main();
}
