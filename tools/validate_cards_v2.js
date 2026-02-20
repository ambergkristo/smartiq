#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOPICS = ['History', 'Sports', 'Geography', 'Culture', 'Science', 'Varia'];
const CATEGORIES = ['TRUE_FALSE', 'NUMBER', 'ORDER', 'CENTURY_DECADE', 'COLOR', 'OPEN'];
const ALLOWED_SOURCES = new Set(['smartiq-v2', 'smartiq-human', 'smartiq-verified']);
const MIN_PER_COMBO = 30;
const SOFT_OPTION_MAX_LEN = 42;

function normalizeText(value) {
  return String(value ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function normalizeLoose(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function parseDataset(datasetPath) {
  const absPath = path.resolve(process.cwd(), datasetPath);
  const raw = fs.readFileSync(absPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error('Dataset must be a top-level array');
  }
  return { absPath, cards: parsed };
}

function toOptionText(option) {
  if (option && typeof option === 'object' && 'text' in option) {
    return normalizeText(option.text);
  }
  return normalizeText(option);
}

function toIndexArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((n) => Number.isInteger(n));
}

function inRangeZeroToNine(n) {
  return Number.isInteger(n) && n >= 0 && n < 10;
}

function validateCorrectByCategory(card, context, hardErrors) {
  const correct = card.correct;
  if (!correct || typeof correct !== 'object') {
    hardErrors.push(`${context}: missing correct object`);
    return;
  }

  if (card.category === 'TRUE_FALSE' || card.category === 'OPEN') {
    const indexes = toIndexArray(correct.correctIndexes);
    if (indexes.length < 1) {
      hardErrors.push(`${context}: ${card.category} requires correct.correctIndexes[]`);
      return;
    }
    const unique = new Set(indexes);
    if (unique.size !== indexes.length || indexes.some((n) => !inRangeZeroToNine(n))) {
      hardErrors.push(`${context}: ${card.category} correctIndexes must be unique ints in 0..9`);
    }
    return;
  }

  if (card.category === 'NUMBER' || card.category === 'CENTURY_DECADE' || card.category === 'COLOR') {
    if (!inRangeZeroToNine(correct.correctIndex)) {
      hardErrors.push(`${context}: ${card.category} requires correct.correctIndex in 0..9`);
    }
    return;
  }

  if (card.category === 'ORDER') {
    const rankByIndex = Array.isArray(correct.rankByIndex) ? correct.rankByIndex : null;
    const correctOrder = Array.isArray(correct.correctOrder) ? correct.correctOrder : null;
    const ranks = rankByIndex || correctOrder;
    if (!ranks || ranks.length !== 10) {
      hardErrors.push(`${context}: ORDER requires rankByIndex[10] (or correctOrder[10])`);
      return;
    }
    if (!ranks.every((n) => Number.isInteger(n) && n >= 1 && n <= 10) || new Set(ranks).size !== 10) {
      hardErrors.push(`${context}: ORDER ranks must be a permutation of 1..10`);
    }
    return;
  }

  hardErrors.push(`${context}: unsupported category '${card.category}'`);
}

function main() {
  const datasetPath = process.argv[2] || 'data/smart10/cards.en.json';
  const maxWarningsArg = process.argv.find((arg) => arg.startsWith('--max-warnings='));
  const maxWarnings = maxWarningsArg ? Number.parseInt(maxWarningsArg.split('=')[1], 10) : null;
  const { absPath, cards } = parseDataset(datasetPath);

  const hardErrors = [];
  const warnings = [];

  const perCategory = new Map();
  const perTopic = new Map();
  const perLanguage = new Map();
  const perCombo = new Map();
  const perSource = new Map();

  const duplicateQuestionIndex = new Map();
  const nearDuplicateQuestionIndex = new Map();
  const duplicateCardSignatureIndex = new Map();
  const tfTrueCounts = [];

  cards.forEach((card, idx) => {
    const context = `cards[${idx}] id=${normalizeText(card?.id) || 'missing'}`;
    const requiredFields = ['id', 'topic', 'category', 'language', 'question', 'options', 'correct', 'source'];
    for (const field of requiredFields) {
      if (card?.[field] == null || normalizeText(card[field]) === '') {
        hardErrors.push(`${context}: missing required field '${field}'`);
      }
    }

    const topic = normalizeText(card.topic);
    const category = normalizeText(card.category);
    const language = normalizeText(card.language).toLowerCase();
    const source = normalizeText(card.source).toLowerCase();
    const question = normalizeText(card.question);

    if (!TOPICS.includes(topic)) {
      hardErrors.push(`${context}: invalid topic '${topic}'`);
    }
    if (!CATEGORIES.includes(category)) {
      hardErrors.push(`${context}: invalid category '${category}'`);
    }
    if (!language) {
      hardErrors.push(`${context}: empty language`);
    }
    if (!ALLOWED_SOURCES.has(source)) {
      hardErrors.push(`${context}: source '${source}' is not in allowed set`);
    }

    if (!Array.isArray(card.options) || card.options.length !== 10) {
      hardErrors.push(`${context}: options must contain exactly 10 entries`);
    } else {
      const optionTexts = card.options.map(toOptionText);
      if (optionTexts.some((entry) => entry.length === 0)) {
        hardErrors.push(`${context}: options contain empty/whitespace entries`);
      }
      if (new Set(optionTexts.map((entry) => entry.toLowerCase())).size !== optionTexts.length) {
        hardErrors.push(`${context}: duplicate options within card`);
      }
      optionTexts.forEach((entry, optionIndex) => {
        if (entry.length > SOFT_OPTION_MAX_LEN) {
          warnings.push(`${context}: option[${optionIndex}] length=${entry.length} exceeds ${SOFT_OPTION_MAX_LEN}`);
        }
      });
    }

    validateCorrectByCategory(card, context, hardErrors);

    if (category === 'TRUE_FALSE') {
      const trueCount = toIndexArray(card.correct?.correctIndexes).length;
      if (trueCount > 0) {
        tfTrueCounts.push(trueCount);
      }
    }

    perCategory.set(category, (perCategory.get(category) || 0) + 1);
    perTopic.set(topic, (perTopic.get(topic) || 0) + 1);
    perLanguage.set(language, (perLanguage.get(language) || 0) + 1);
    perSource.set(source, (perSource.get(source) || 0) + 1);
    const comboKey = `${category}|${topic}`;
    perCombo.set(comboKey, (perCombo.get(comboKey) || 0) + 1);

    const exactQuestionKey = `${topic}|${category}|${question.toLowerCase()}`;
    if (duplicateQuestionIndex.has(exactQuestionKey)) {
      warnings.push(`${context}: duplicate question stem with ${duplicateQuestionIndex.get(exactQuestionKey)}`);
    } else {
      duplicateQuestionIndex.set(exactQuestionKey, context);
    }

    const nearQuestionKey = `${topic}|${category}|${normalizeLoose(question)}`;
    if (nearDuplicateQuestionIndex.has(nearQuestionKey)) {
      warnings.push(`${context}: near-duplicate question stem with ${nearDuplicateQuestionIndex.get(nearQuestionKey)}`);
    } else {
      nearDuplicateQuestionIndex.set(nearQuestionKey, context);
    }

    if (Array.isArray(card.options) && card.options.length === 10) {
      const normalizedOptions = card.options.map(toOptionText).map((entry) => entry.toLowerCase());
      const cardSignature = `${topic}|${category}|${question.toLowerCase()}|${normalizedOptions.join('||')}`;
      if (duplicateCardSignatureIndex.has(cardSignature)) {
        hardErrors.push(`${context}: duplicate card content with ${duplicateCardSignatureIndex.get(cardSignature)}`);
      } else {
        duplicateCardSignatureIndex.set(cardSignature, context);
      }
    }
  });

  for (const category of CATEGORIES) {
    if (!perCategory.has(category)) {
      hardErrors.push(`distribution: missing category '${category}'`);
    }
    for (const topic of TOPICS) {
      const comboKey = `${category}|${topic}`;
      const count = perCombo.get(comboKey) || 0;
      if (count < MIN_PER_COMBO) {
        hardErrors.push(`distribution: ${comboKey} has ${count}, required >=${MIN_PER_COMBO}`);
      }
    }
  }

  for (const topic of TOPICS) {
    if (!perTopic.has(topic)) {
      hardErrors.push(`distribution: missing topic '${topic}'`);
    }
  }

  if (tfTrueCounts.length > 0) {
    const oneCount = tfTrueCounts.filter((n) => n === 1).length;
    const nineCount = tfTrueCounts.filter((n) => n === 9).length;
    if (oneCount === tfTrueCounts.length) {
      warnings.push('TRUE_FALSE skew: all cards have exactly 1 true option');
    }
    if (nineCount === tfTrueCounts.length) {
      warnings.push('TRUE_FALSE skew: all cards have exactly 9 true options');
    }
    if (oneCount > tfTrueCounts.length * 0.45) {
      warnings.push(`TRUE_FALSE skew: ${oneCount}/${tfTrueCounts.length} cards have exactly 1 true option`);
    }
    if (nineCount > tfTrueCounts.length * 0.15) {
      warnings.push(`TRUE_FALSE skew: ${nineCount}/${tfTrueCounts.length} cards have exactly 9 true options`);
    }
  }

  const summary = {
    dataset: absPath,
    totalCards: cards.length,
    byCategory: Object.fromEntries([...perCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    byTopic: Object.fromEntries([...perTopic.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    byLanguage: Object.fromEntries([...perLanguage.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    bySource: Object.fromEntries([...perSource.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    hardErrorCount: hardErrors.length,
    warningCount: warnings.length
  };

  console.log(JSON.stringify(summary, null, 2));

  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.slice(0, 200).forEach((item) => console.log(`- ${item}`));
    if (warnings.length > 200) {
      console.log(`- ...and ${warnings.length - 200} more`);
    }
  }

  if (hardErrors.length > 0) {
    console.error('\nHard violations:');
    hardErrors.slice(0, 200).forEach((item) => console.error(`- ${item}`));
    if (hardErrors.length > 200) {
      console.error(`- ...and ${hardErrors.length - 200} more`);
    }
    process.exit(1);
  }

  if (maxWarnings != null && Number.isFinite(maxWarnings) && warnings.length > maxWarnings) {
    console.error(`\nWarning limit exceeded: warnings=${warnings.length}, maxWarnings=${maxWarnings}`);
    process.exit(1);
  }

  console.log('\nValidation passed.');
}

main();
