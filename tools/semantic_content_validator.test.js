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

test('flags ET encoding damage inside words as broken grammar', () => {
  const result = analyzeCards([
    buildCard({
      id: 'et-mojibake',
      language: 'et',
      question: 'Geograafia: Millised v?ited Tallinna kohta peavad paika?',
      options: [
        'Tallinn asub L??nemere ??res.',
        'Riigikogu koguneb Tallinnas.',
        'Tallinn on Eesti pealinn.',
        'Tallinn j??b Riiast l?unasse.',
        'Tallinnas kasutatakse eurot.',
        'Tallinn asub Portugalis.',
        'Tallinn on Austraalia pealinn.',
        'Linn paikneb Niiluse ??res.',
        'Tallinn on tuntud vanade m??ride t?ttu.',
        'Tallinn asub L?una-Ameerikas.'
      ]
    })
  ], 'fixture-et-mojibake');

  assert.equal(result.summary.issueCounts.brokenGrammarCards, 1);
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

test('flags generic OPEN prompt scaffolds even with unique options', () => {
  const result = analyzeCards([
    buildCard({
      id: 'open-scaffold-en',
      topic: 'Sports',
      category: 'OPEN',
      question: 'Sports: Select statements that are true. Topic clue: Football.',
      options: [
        'Football uses a round ball.',
        'A match begins with kickoff.',
        'Goals count when the ball crosses the line.',
        'Teams usually field eleven players.',
        'Football is played underwater.',
        'A match has nine innings.',
        'The ball must be square.',
        'Goals are scored with rackets.',
        'Corner kicks belong to snooker.',
        'The goalkeeper is banned by rule.'
      ]
    }),
    buildCard({
      id: 'open-scaffold-et',
      language: 'et',
      topic: 'Sports',
      category: 'OPEN',
      question: 'Sport: Millised vaited on oiged? Teemavihe: Football.',
      options: [
        'Jalgpallis kasutatakse ummarust palli.',
        'Mang algab avaloogiga.',
        'Varav loeb ule joone minnes.',
        'Valjakul on tavaliselt uksteist mangijat.',
        'Jalgpalli mangitakse vee all.',
        'Mang koosneb uheksast vahetusest.',
        'Pall peab olema kandiline.',
        'Varavaid saadakse ainult reketiga.',
        'Nurgaloog kuulub snuukrisse.',
        'Varavavaht on keelatud.'
      ]
    })
  ], 'fixture-open-scaffold');

  assert.equal(result.summary.issueCounts.scaffoldCards, 2);
  assert.equal(result.summary.issueCounts.brokenGrammarCards, 1);
});

test('flags non-functional theme and context suffixes in EN and ET questions', () => {
  const result = analyzeCards([
    buildCard({
      id: 'suffix-en',
      topic: 'Sports',
      category: 'NUMBER',
      question: 'Sports: How many minutes are in one football half? Context tag: Triathlon.',
      options: ['30', '35', '40', '45', '50', '55', '60', '65', '70', '75']
    }),
    buildCard({
      id: 'suffix-et',
      language: 'et',
      topic: 'Sport',
      category: 'NUMBER',
      question: 'Sport: Mitu minutit kestab üks jalgpalli poolaeg? Kontekst: Triatlon.',
      options: ['30', '35', '40', '45', '50', '55', '60', '65', '70', '75']
    })
  ], 'fixture-context-suffix');

  assert.equal(result.summary.issueCounts.unnaturalPhrasingCards, 2);
});
