#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ENGLISH_MARKER_REGEXES = [
  /\bfocus area\b/i,
  /\bmark statements that are true\b/i,
  /\bwhich claims are accurate\b/i,
  /\bwhich statements are true\b/i,
  /\bwhich lines are correct\b/i,
  /\bidentify valid statements\b/i,
  /\bcentered in\b/i,
  /\bbegan in\b/i,
  /\bfell in\b/i,
  /\blanded in\b/i,
  /\bcame before\b/i,
  /\bfollowed\b/i,
  /\bsigned in\b/i,
  /\bdissolved in\b/i,
  /\bwon at\b/i,
  /\blost at\b/i,
  /\bwas killed in\b/i,
  /\border\b/i,
  /\bshortest first\b/i,
  /\boldest era to newest\b/i,
  /\bsmall(?:est)? to large\b/i,
  /\bdates from past to recent\b/i,
  /\bplayers per side\b/i,
  /\bwhich color matches\b/i,
  /\bpick the color best matching\b/i,
  /\bwhich option names the right color\b/i,
  /\bis closest to which color\b/i,
  /\bchoose the color cue\b/i
];

const ESTONIAN_MARKER_REGEXES = [
  /\bfookus\b/i,
  /\bmillised väited on õiged\b/i,
  /\bmillised vaited on oiged\b/i,
  /\bmärgi selle teema tõesed väited\b/i,
  /\bmargi selle teema toesed vaited\b/i,
  /\bjarjesta\b/i,
  /\bvali värv\b/i,
  /\bvali varv\b/i,
  /\bmilline värv sobib\b/i,
  /\bmilline varv sobib\b/i,
  /\bkõige\b/i,
  /\bkoige\b/i
];

const ENGLISH_STOPWORDS = new Set([
  'the', 'and', 'was', 'were', 'is', 'are', 'in', 'of', 'to', 'for', 'with', 'before', 'after',
  'won', 'ended', 'began', 'signed', 'followed', 'came', 'true', 'false', 'order', 'oldest',
  'newest', 'shortest', 'small', 'large', 'which', 'color', 'matches', 'pick', 'best', 'right'
]);

const ESTONIAN_STOPWORDS = new Set([
  'ja', 'on', 'oli', 'olid', 'enne', 'pärast', 'parast', 'teema', 'fookus', 'õiged', 'oiged', 'väited',
  'vaited', 'märgi', 'margi', 'tõene', 'toene', 'vale', 'algas', 'lõppes', 'loppes', 'selle', 'millised',
  'jarjesta', 'vali', 'värv', 'varv', 'kõige', 'koige'
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
  /^\s*(history|sports|geography|culture|science|varia):\s*(mark statements that are true for this topic|which claims are accurate|find the statements that fit|select all true statements|which lines are correct|identify valid statements)\.\s*focus area:/i,
  /^\s*(ajalugu|sport|geograafia|kultuur|teadus|varia):\s*(märgi selle teema tõesed väited|margi selle teema toesed vaited|millised väited on õiged|millised vaited on oiged|leia sobivad väited|leia sobivad vaited|vali kõik tõesed väited|vali koik toed vaited|millised read on õiged|millised read on oiged|tuvasta kehtivad väited|tuvasta kehtivad vaited)\.\s*fookus:/i
];

const UNNATURAL_PHRASING_REGEXES = [
  /^\s*(history|sports|geography|culture|science|varia):\s*(which color matches|pick the color best matching|select the color for|which option names the right color for|choose the color cue|'.+' is closest to which color)/i,
  /^\s*(ajalugu|sport|geograafia|kultuur|teadus|varia):\s*(milline värv sobib|milline varv sobib|vali värv|vali varv|milline variant nimetab õige värvi|milline variant nimetab oige varvi|vali värvivihje|vali varvivihje|'.+' on kõige lähedasem millisele värvile|'.+' on koige lahedasem millisele varvile)/i,
  /^\s*(ajalugu|sport|geograafia|kultuur|teadus|varia):\s*order\b/i
];

const BROKEN_ESTONIAN_REGEXES = [
  /\bvaited\b/i,
  /\boiged\b/i,
  /\btoesed\b/i,
  /\bkoik\b/i,
  /\bmargi\b/i,
  /\bloppes\b/i,
  /\bparast\b/i,
  /\bjarjesta\b/i,
  /\bvarv\b/i,
  /\bpaevane\b/i,
  /\bvarske\b/i,
  /\bkups\b/i,
  /\blahedasem\b/i,
  /\bois\b/i,
  /\booajal\b/i
];

const ESTONIAN_ENCODING_DAMAGE_REGEXES = [
  /\b\p{L}+\?+\p{L}+\b/u,
  /\?{2,}/,
  /\bv\?ited\b/i,
  /\bo\?iged\b/i,
  /\bto\?ed\b/i,
  /\bl\?\?nemere\b/i
];

const ET_LOW_TRUST_OPTION_REGEXES = [
  /^\s*mint\s*$/i,
  /^\s*hobene\s*$/i
];

const ISSUE_WEIGHTS = {
  language_leakage: 1.4,
  broken_grammar: 1.1,
  unnatural_phrasing: 1.0,
  template_scaffold: 1.0,
  placeholder_content: 1.3,
  recycled_option_pool: 1.2,
  low_trust_option: 1.2,
  trivial_answers: 1.0
};

const ISSUE_FIELDS = {
  language_leakage: 'languageLeakageCards',
  broken_grammar: 'brokenGrammarCards',
  unnatural_phrasing: 'unnaturalPhrasingCards',
  template_scaffold: 'scaffoldCards',
  placeholder_content: 'placeholderCards',
  recycled_option_pool: 'recycledOptionCards',
  low_trust_option: 'lowTrustOptionCards',
  trivial_answers: 'trivialAnswerCards'
};

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
  return markers.reduce((count, regex) => count + (regex.test(text) ? 1 : 0), 0);
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
    return markerHitCount(normalized, ENGLISH_MARKER_REGEXES) > 0
      || stopwordHitCount(tokens, ENGLISH_STOPWORDS) >= 3;
  }

  if (expectedLanguage === 'en') {
    return markerHitCount(normalized, ESTONIAN_MARKER_REGEXES) > 0
      || stopwordHitCount(tokens, ESTONIAN_STOPWORDS) >= 3;
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

function hasUnnaturalPhrasing(question) {
  const normalized = normalizeText(question);
  return UNNATURAL_PHRASING_REGEXES.some((regex) => regex.test(normalized));
}

function hasBrokenEstonian(text) {
  const normalized = normalizeText(text);
  return BROKEN_ESTONIAN_REGEXES.some((regex) => regex.test(normalized))
    || ESTONIAN_ENCODING_DAMAGE_REGEXES.some((regex) => regex.test(normalized));
}

function hasLowTrustEtOptions(options) {
  return options.some((option) => ET_LOW_TRUST_OPTION_REGEXES.some((regex) => regex.test(normalizeText(option))));
}

function isNumericToken(token) {
  return /^-?\d+(?:\.\d+)?$/.test(token);
}

function hasTrivialAnswers(category, options) {
  const normalizedOptions = options.map((entry) => normalizeLoose(entry)).filter(Boolean);
  if (normalizedOptions.length === 0) {
    return false;
  }

  const categoryName = normalizeText(category).toUpperCase();
  const shortCount = normalizedOptions.filter((entry) => entry.length <= 2 && !isNumericToken(entry)).length;
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

function buildOptionFrequency(cards) {
  const frequency = new Map();
  for (const card of cards) {
    const locale = String(card?.language || 'en').trim().toLowerCase() || 'en';
    const category = String(card?.category || '').trim().toUpperCase();
    if (!['TRUE_FALSE', 'OPEN'].includes(category)) {
      continue;
    }
    const options = Array.isArray(card?.options) ? card.options.map((option) => normalizeLoose(option?.text ?? option)).filter(Boolean) : [];
    for (const option of options) {
      const key = `${locale}|${category}|${option}`;
      frequency.set(key, (frequency.get(key) || 0) + 1);
    }
  }
  return frequency;
}

function detectRecycledOptionPool(language, category, options, optionFrequency) {
  if (!['TRUE_FALSE', 'OPEN'].includes(String(category || '').trim().toUpperCase())) {
    return { hit: false, repeatedOptions: [] };
  }
  const repeatedOptions = options.filter((option) => {
    const normalizedOption = normalizeLoose(option);
    const key = `${language}|${String(category || '').trim().toUpperCase()}|${normalizedOption}`;
    return (optionFrequency.get(key) || 0) >= 6;
  });
  return {
    hit: repeatedOptions.length >= 4,
    repeatedOptions
  };
}

function issueCountsTemplate() {
  return {
    languageLeakageCards: 0,
    brokenGrammarCards: 0,
    unnaturalPhrasingCards: 0,
    placeholderCards: 0,
    scaffoldCards: 0,
    recycledOptionCards: 0,
    lowTrustOptionCards: 0,
    trivialAnswerCards: 0
  };
}

function areaKey(card) {
  return `${normalizeText(card?.language).toLowerCase() || 'en'}|${normalizeText(card?.topic) || 'Unknown'}|${normalizeText(card?.category) || 'Unknown'}`;
}

function readinessForSummary(summary) {
  if (summary.issueCounts.languageLeakageCards > 0 || summary.issueCounts.brokenGrammarCards > 0) {
    return 'launch_blocked';
  }
  if (summary.semanticContentScore < 0.95 || summary.issueCounts.recycledOptionCards > 0 || summary.issueCounts.scaffoldCards > 0) {
    return 'editorial_repair_required';
  }
  return 'conditionally_ready';
}

function analyzeCards(cards, datasetLabel = 'dataset') {
  const warnings = [];
  const issueCounts = issueCountsTemplate();
  const cardFindings = [];
  const areas = new Map();
  const optionFrequency = buildOptionFrequency(cards);

  let totalPenalty = 0;
  let totalMaxPenalty = 0;

  for (const card of cards) {
    const cardId = String(card?.cardId || card?.id || 'unknown').trim();
    const language = String(card?.language || '').trim().toLowerCase() || 'en';
    const question = normalizeText(card?.question);
    const options = Array.isArray(card?.options) ? card.options.map((option) => normalizeText(option?.text ?? option)) : [];
    const issues = [];

    totalMaxPenalty += Object.keys(ISSUE_WEIGHTS).length;

    const questionLeakage = looksLikeOppositeLanguage(question, language);
    const leakedOptions = options.filter((option) => looksLikeOppositeLanguage(option, language)).length;
    const optionLeakage = options.length > 0 && leakedOptions >= Math.max(2, Math.ceil(options.length * 0.3));
    if (questionLeakage || optionLeakage) {
      issues.push({
        type: 'language_leakage',
        detail: `opposite-language leakage detected (question=${questionLeakage}, options=${leakedOptions}/${options.length})`
      });
    }

    if (language === 'et' && ([question, ...options].some((entry) => hasBrokenEstonian(entry)))) {
      issues.push({
        type: 'broken_grammar',
        detail: 'ASCII-damaged, encoding-damaged, or broken Estonian phrasing detected'
      });
    }

    if (hasUnnaturalPhrasing(question)) {
      issues.push({
        type: 'unnatural_phrasing',
        detail: 'over-templated or unnatural question phrasing detected'
      });
    }

    if (hasTemplateScaffold(question)) {
      issues.push({
        type: 'template_scaffold',
        detail: 'template scaffold phrase detected'
      });
    }

    if (hasPlaceholderContent(question, options)) {
      issues.push({
        type: 'placeholder_content',
        detail: 'placeholder-like content detected'
      });
    }

    const recycled = detectRecycledOptionPool(language, card?.category, options, optionFrequency);
    if (recycled.hit) {
      issues.push({
        type: 'recycled_option_pool',
        detail: `recycled option pool detected (${recycled.repeatedOptions.length}/${options.length} options reused >= 6 times)`
      });
    }

    if (language === 'et' && hasLowTrustEtOptions(options)) {
      issues.push({
        type: 'low_trust_option',
        detail: 'low-trust ET option wording detected'
      });
    }

    if (hasTrivialAnswers(card?.category, options)) {
      issues.push({
        type: 'trivial_answers',
        detail: 'trivial or low-information answer set detected'
      });
    }

    totalPenalty += issues.reduce((sum, issue) => sum + ISSUE_WEIGHTS[issue.type], 0);

    if (issues.length === 0) {
      continue;
    }

    const finding = {
      cardId,
      language,
      topic: normalizeText(card?.topic),
      category: normalizeText(card?.category),
      question,
      issues
    };
    cardFindings.push(finding);

    const area = areaKey(card);
    if (!areas.has(area)) {
      areas.set(area, {
        locale: language,
        topic: normalizeText(card?.topic),
        category: normalizeText(card?.category),
        cards: 0,
        issueCards: 0,
        issueTypes: new Map()
      });
    }
    const areaStats = areas.get(area);
    areaStats.issueCards += 1;

    for (const issue of issues) {
      const field = ISSUE_FIELDS[issue.type];
      if (field) {
        issueCounts[field] += 1;
      }
      areaStats.issueTypes.set(issue.type, (areaStats.issueTypes.get(issue.type) || 0) + 1);
      warnings.push(`${cardId}: ${issue.detail}`);
    }
  }

  for (const card of cards) {
    const area = areaKey(card);
    if (!areas.has(area)) {
      areas.set(area, {
        locale: String(card?.language || 'en').trim().toLowerCase() || 'en',
        topic: normalizeText(card?.topic),
        category: normalizeText(card?.category),
        cards: 0,
        issueCards: 0,
        issueTypes: new Map()
      });
    }
    areas.get(area).cards += 1;
  }

  const highestRiskAreas = Array.from(areas.values())
    .map((entry) => ({
      locale: entry.locale,
      topic: entry.topic,
      category: entry.category,
      cards: entry.cards,
      issueCards: entry.issueCards,
      issueRate: entry.cards > 0 ? Number((entry.issueCards / entry.cards).toFixed(3)) : 0,
      topIssues: Array.from(entry.issueTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([issueType]) => issueType)
    }))
    .sort((a, b) => {
      if (b.issueRate !== a.issueRate) {
        return b.issueRate - a.issueRate;
      }
      return b.issueCards - a.issueCards;
    })
    .slice(0, 12);

  const semanticContentScore = Number((1 - totalPenalty / Math.max(1, totalMaxPenalty)).toFixed(3));
  const summary = {
    dataset: datasetLabel,
    cards: cards.length,
    semanticContentScore,
    issueCounts,
    highestRiskAreas,
    warningCount: warnings.length
  };
  summary.readiness = readinessForSummary(summary);

  return {
    summary,
    warnings,
    cardFindings
  };
}

function printResult(result, maxWarnings) {
  console.log(JSON.stringify(result.summary, null, 2));
  if (result.warnings.length > 0) {
    console.log('\nSemantic content warnings:');
    result.warnings.slice(0, maxWarnings).forEach((warning) => console.log(`- ${warning}`));
    if (result.warnings.length > maxWarnings) {
      console.log(`- ...and ${result.warnings.length - maxWarnings} more`);
    }
  }
}

function main() {
  const { inputPath, failThreshold, maxWarnings } = parseArgs(process.argv.slice(2));
  const { abs, cards } = loadCards(inputPath);
  const result = analyzeCards(cards, abs);

  printResult(result, maxWarnings);

  if (Number.isFinite(failThreshold) && result.summary.semanticContentScore < failThreshold) {
    console.error(`\nSemantic content score ${result.summary.semanticContentScore.toFixed(3)} is below fail-threshold ${failThreshold.toFixed(3)}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeCards,
  loadCards,
  normalizeText,
  normalizeLoose,
  tokenize,
  looksLikeOppositeLanguage,
  hasBrokenEstonian,
  hasPlaceholderContent,
  hasTemplateScaffold,
  hasUnnaturalPhrasing,
  hasTrivialAnswers,
  detectRecycledOptionPool
};
