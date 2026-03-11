#!/usr/bin/env node
const childProcess = require('child_process');
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
  const editorialArg = args.find((arg) => arg.startsWith('--editorial-report='));
  return {
    editorialReportPath: editorialArg
      ? editorialArg.split('=')[1]
      : `docs/reports/${new Date().toISOString().slice(0, 10)}-editorial-spot-check.md`,
    outPath: outArg
      ? outArg.split('=')[1]
      : `docs/reports/${new Date().toISOString().slice(0, 10)}-content-truth-audit.md`
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function formatReadiness(summary, structuralSummary, locale) {
  const totalIssues = issueTotal(summary);
  const validatorClean = structuralSummary.hardErrorCount === 0 && structuralSummary.warningCount === 0;
  if (totalIssues === 0 && validatorClean) {
    return 'CONDITIONAL - editorial verification pending';
  }
  if (totalIssues === 0) {
    return 'CONDITIONAL - semantic blockers cleared; structural/manual review still required';
  }
  if (
    summary.semanticContentScore >= 0.95 &&
    summary.issueCounts.languageLeakageCards === 0 &&
    summary.issueCounts.brokenGrammarCards === 0
  ) {
    return 'CONDITIONAL - editorial cleanup still required';
  }
  if (locale === 'et' && (summary.issueCounts.languageLeakageCards > 0 || summary.issueCounts.brokenGrammarCards > 0)) {
    return 'BLOCKED - ET localization is not launch-ready';
  }
  return 'NOT READY - editorial cleanup required before launch trust';
}

function extractLeadingJson(text) {
  const normalized = String(text || '').trim();
  const boundaryIndex = normalized.indexOf('\n\n');
  const jsonBlock = boundaryIndex === -1 ? normalized : normalized.slice(0, boundaryIndex);
  return JSON.parse(jsonBlock);
}

function runStructuralValidation(datasetFile) {
  const scriptPath = path.resolve(__dirname, 'validate_cards_v2.js');
  const result = childProcess.spawnSync(process.execPath, [scriptPath, datasetFile], {
    cwd: process.cwd(),
    encoding: 'utf8'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `Structural validation failed for ${datasetFile}`);
  }

  return extractLeadingJson(result.stdout);
}

function parseEditorialLine(content, label, fallback) {
  const pattern = new RegExp(`^- ${label}:\\s*(.+)$`, 'm');
  const match = String(content || '').match(pattern);
  return match ? match[1].trim() : fallback;
}

function loadEditorialStatus(editorialReportPath) {
  const absPath = path.resolve(process.cwd(), editorialReportPath);
  const fallback = {
    path: editorialReportPath,
    validatorCleanStatus: 'UNKNOWN',
    byLocale: {
      en: {
        spotCheckStatus: 'PENDING',
        launchTrustStatus: 'CONDITIONAL - editorial verification pending'
      },
      et: {
        spotCheckStatus: 'PENDING',
        launchTrustStatus: 'CONDITIONAL - editorial verification pending'
      }
    }
  };

  if (!fs.existsSync(absPath)) {
    return fallback;
  }

  const content = fs.readFileSync(absPath, 'utf8');
  return {
    path: editorialReportPath,
    validatorCleanStatus: parseEditorialLine(content, 'Validator-clean status', fallback.validatorCleanStatus),
    byLocale: {
      en: {
        spotCheckStatus: parseEditorialLine(content, 'EN spot-check status', fallback.byLocale.en.spotCheckStatus),
        launchTrustStatus: parseEditorialLine(content, 'EN launch-trust status', fallback.byLocale.en.launchTrustStatus)
      },
      et: {
        spotCheckStatus: parseEditorialLine(content, 'ET spot-check status', fallback.byLocale.et.spotCheckStatus),
        launchTrustStatus: parseEditorialLine(content, 'ET launch-trust status', fallback.byLocale.et.launchTrustStatus)
      }
    }
  };
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
  const structuralSummary = runStructuralValidation(localeConfig.file);
  return {
    ...localeConfig,
    result,
    structuralSummary
  };
}

function issueTotal(summary) {
  return Object.values(summary.issueCounts).reduce((sum, value) => sum + Number(value || 0), 0);
}

function buildReport(localeSummaries, editorialStatus) {
  const generatedAt = new Date().toISOString();
  const sections = [
    '# Content Truth Audit',
    '',
    '## Metadata',
    '',
    `- Generated: ${generatedAt}`,
    `- Scope: ${localeSummaries.map((entry) => entry.label).join(', ')} SmartIQ locale packs`,
    `- Editorial spot-check report: \`${editorialStatus.path}\``,
    '',
    '## Executive Summary',
    ''
  ];

  for (const locale of localeSummaries) {
    const summary = locale.result.summary;
    const editorialLocale = editorialStatus.byLocale[locale.code];
    const validatorClean =
      locale.structuralSummary.hardErrorCount === 0 &&
      locale.structuralSummary.warningCount === 0 &&
      issueTotal(summary) === 0;
    sections.push(
      `- ${locale.label}: validator-clean ${validatorClean ? 'PASS' : 'FAIL'} | editorial spot-check ${editorialLocale.spotCheckStatus} | launch-trust ${editorialLocale.launchTrustStatus} | score ${summary.semanticContentScore.toFixed(3)} | total issues ${issueTotal(summary)}`
    );
  }

  for (const locale of localeSummaries) {
    const summary = locale.result.summary;
    const editorialLocale = editorialStatus.byLocale[locale.code];
    const validatorClean =
      locale.structuralSummary.hardErrorCount === 0 &&
      locale.structuralSummary.warningCount === 0 &&
      issueTotal(summary) === 0;
    sections.push('', `## ${locale.label} Findings`, '');
    sections.push(`- Dataset: \`${locale.file}\``);
    sections.push(`- Semantic content score: ${summary.semanticContentScore.toFixed(3)}`);
    sections.push(`- Structural hard errors: ${locale.structuralSummary.hardErrorCount}`);
    sections.push(`- Structural warning count: ${locale.structuralSummary.warningCount}`);
    sections.push(`- Validator-clean status: ${validatorClean ? 'PASS' : 'FAIL'}`);
    sections.push(`- Editorial spot-check: ${editorialLocale.spotCheckStatus}`);
    sections.push(`- Launch-trust status: ${editorialLocale.launchTrustStatus}`);
    sections.push(`- Launch readiness: ${formatReadiness(summary, locale.structuralSummary, locale.code)}`);
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
  const { editorialReportPath, outPath } = parseArgs(process.argv.slice(2));
  const localeSummaries = LOCALES.map(summarizeLocale);
  const editorialStatus = loadEditorialStatus(editorialReportPath);
  const report = buildReport(localeSummaries, editorialStatus);
  const absOutPath = path.resolve(process.cwd(), outPath);
  ensureDir(absOutPath);
  fs.writeFileSync(absOutPath, report, 'utf8');
  console.log(`Content truth report written: ${absOutPath}`);
}

if (require.main === module) {
  main();
}
