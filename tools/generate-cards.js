const fs = require('fs');
const path = require('path');

function makeOptions(correct, fillers) {
  return [correct, ...fillers].slice(0, 10);
}

function mathCards() {
  const cards = [];
  const filler = ['7', '8', '9', '10', '11', '12', '13', '14', '15'];
  for (let i = 1; i <= 20; i += 1) {
    const a = i;
    const b = i + 1;
    const answer = String(a + b);
    cards.push({
      id: `math-en-${i}`,
      topic: 'Math',
      subtopic: i % 2 === 0 ? 'Addition' : null,
      language: 'en',
      question: `What is ${a} + ${b}?`,
      options: makeOptions(answer, filler.map((x, idx) => String(Number(x) + i + idx))),
      correctIndex: 0,
      difficulty: i <= 7 ? 'easy' : i <= 14 ? 'medium' : 'hard',
      source: 'smartiq-generated-v1',
      createdAt: '2026-02-17T00:00:00Z'
    });
  }
  return cards;
}

function scienceCards() {
  const qa = [
    ['What planet is known as the Red Planet?', 'Mars'],
    ['What gas do plants absorb from the atmosphere?', 'Carbon dioxide'],
    ['What is the center of an atom called?', 'Nucleus'],
    ['What force keeps planets in orbit around the Sun?', 'Gravity'],
    ['What is H2O commonly called?', 'Water'],
    ['What organ pumps blood through the body?', 'Heart'],
    ['What is the nearest star to Earth?', 'The Sun'],
    ['What part of the cell contains DNA in eukaryotes?', 'Nucleus'],
    ['What is the boiling point of water at sea level in Celsius?', '100'],
    ['What gas do humans breathe in to survive?', 'Oxygen'],
    ['What instrument measures temperature?', 'Thermometer'],
    ['What is the process plants use to make food?', 'Photosynthesis'],
    ['What vitamin is produced when skin is exposed to sunlight?', 'Vitamin D'],
    ['What is the largest organ in the human body?', 'Skin'],
    ['What type of animal is a frog?', 'Amphibian'],
    ['What is the chemical symbol for sodium?', 'Na'],
    ['What blood cells help fight infection?', 'White blood cells'],
    ['What galaxy contains our Solar System?', 'Milky Way'],
    ['What layer protects Earth from ultraviolet radiation?', 'Ozone layer'],
    ['What device is used to look at very small objects?', 'Microscope']
  ];

  return qa.map(([question, answer], idx) => ({
    id: `science-en-${idx + 1}`,
    topic: 'Science',
    subtopic: idx % 3 === 0 ? 'General Science' : null,
    language: 'en',
    question,
    options: makeOptions(answer, [
      'Nitrogen', 'Jupiter', 'Liver', 'Evaporation', 'Hydrogen',
      'Lens', 'Mitochondria', 'Venus', '50'
    ]),
    correctIndex: 0,
    difficulty: idx < 7 ? 'easy' : idx < 14 ? 'medium' : 'hard',
    source: 'smartiq-generated-v1',
    createdAt: '2026-02-17T00:00:00Z'
  }));
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

const root = process.cwd();
const rawDir = path.join(root, 'data', 'raw');
const cleanDir = path.join(root, 'data', 'clean');

if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
if (!fs.existsSync(cleanDir)) fs.mkdirSync(cleanDir, { recursive: true });

const math = mathCards();
const science = scienceCards();

writeJson(path.join(cleanDir, 'math.en.json'), math);
writeJson(path.join(cleanDir, 'science.en.json'), science);
writeJson(path.join(rawDir, 'math.generated.raw.json'), math);
writeJson(path.join(rawDir, 'science.generated.raw.json'), science);
writeJson(path.join(rawDir, 'invalid.sample.raw.json'), [
  {
    id: 'invalid-1',
    topic: 'Math',
    language: 'en',
    question: 'Broken sample question',
    options: ['A', 'B'],
    source: 'invalid-fixture'
  }
]);

console.log('Generated raw and clean datasets.');