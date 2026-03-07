const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeCards } = require('./semantic_content_validator');

function buildCard(overrides) {
  return {
    id: 'card-1',
    language: 'en',
    topic: 'History',
    category: 'TRUE_FALSE',
    question: 'History: Mark statements that are true for this topic. Focus area: Ancient Rome.',
    options: [
      'Byzantium centered in Constantinople.',
      'Renaissance began in Australia.',
      'Berlin Wall fell in 1989.',
      'Caesar was killed in 44 BC.',
      'Apollo 11 landed in 1969.',
      'Magna Carta was signed in 1215.',
      'Cold War followed World War II.',
      'Napoleon lost at Waterloo.',
      'USSR dissolved in 1991.',
      'Printing press spread in the 1400s.'
    ],
    ...overrides
  };
}

test('flags ET mixed-language and broken-grammar defects', () => {
  const result = analyzeCards([
    buildCard({
      id: 'et-1',
      language: 'et',
      question: 'Ajalugu: Order oldest era to newest. Pane varaseim/madalaim kohale 1. Teema: Viking Age.',
      options: [
        'Byzantium centered in Constantinople.',
        'Renaissance began in Australia.',
        'Berlin Wall fell in 1989.',
        'Apollo 11 landed in 1969.',
        'Cold War followed World War II.',
        'Napoleon lost at Waterloo.',
        'USSR dissolved in 1991.',
        'Caesar was killed in 44 BC.',
        'Middle Ages',
        'Industrial Revolution'
      ]
    })
  ], 'fixture-et');

  assert.equal(result.summary.issueCounts.languageLeakageCards, 1);
  assert.equal(result.summary.issueCounts.unnaturalPhrasingCards, 1);
});

test('flags ET low-trust option words', () => {
  const result = analyzeCards([
    buildCard({
      id: 'et-color',
      language: 'et',
      topic: 'History',
      category: 'COLOR',
      question: 'Ajalugu: Milline varv sobib selge paevane taevas?',
      options: ['Mint', 'Hobene', 'Sinine', 'Valge', 'Roheline', 'Must', 'Pruun', 'Kollane', 'Roosa', 'Lilla']
    })
  ], 'fixture-et-color');

  assert.equal(result.summary.issueCounts.lowTrustOptionCards, 1);
  assert.equal(result.summary.issueCounts.brokenGrammarCards, 1);
});

test('flags placeholder and trivial answer defects', () => {
  const result = analyzeCards([
    buildCard({
      id: 'placeholder-1',
      category: 'OPEN',
      question: 'Sample question about reference table placeholder',
      options: ['Option 1', 'Option 1', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    })
  ], 'fixture-placeholder');

  assert.equal(result.summary.issueCounts.placeholderCards, 1);
  assert.equal(result.summary.issueCounts.trivialAnswerCards, 1);
});

test('flags recycled option pools in repetitive true-false cards', () => {
  const repetitiveCards = Array.from({ length: 6 }, (_, index) => buildCard({ id: `recycled-${index + 1}` }));
  const result = analyzeCards(repetitiveCards, 'fixture-recycled');

  assert.ok(result.summary.issueCounts.recycledOptionCards >= 1);
});
