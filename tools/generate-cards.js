#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOPICS = ['Math', 'Science', 'History'];
const DIFFICULTIES = ['1', '2', '3'];
const DEFAULT_TARGET_PER_KEY = Number(process.env.TARGET_PER_KEY || 50);
const LANGUAGE = process.env.GEN_LANG || 'en';

function normalizeText(value) {
  return String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
}

function makeOptions(correct, seed) {
  const fillers = [];
  for (let i = 1; i <= 20; i += 1) {
    fillers.push(`${correct} alt ${seed}-${i}`);
  }
  return [correct, ...fillers].slice(0, 10);
}

function makeCard(topic, difficulty, language, index) {
  const question = normalizeText(`${topic} level ${difficulty}: sample question #${index + 1}?`);
  return {
    id: `${topic.toLowerCase()}-${difficulty}-${language}-${index + 1}`,
    topic,
    subtopic: index % 4 === 0 ? `${topic} Fundamentals` : null,
    language,
    difficulty,
    question,
    questionType: 'single',
    options: makeOptions(`Correct ${topic} ${difficulty} ${index + 1}`, `${topic}-${difficulty}-${index}`),
    correctIndex: 0,
    source: 'smartiq-generator-v2',
    createdAt: new Date().toISOString()
  };
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function parseTarget() {
  const arg = process.argv.find((x) => x.startsWith('--target-per-key='));
  if (!arg) return DEFAULT_TARGET_PER_KEY;
  const parsed = Number(arg.split('=')[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_TARGET_PER_KEY;
}

function main() {
  const targetPerKey = parseTarget();
  const root = process.cwd();
  const rawDir = path.join(root, 'data', 'raw');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });

  const allCards = [];
  for (const topic of TOPICS) {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < targetPerKey; i += 1) {
        allCards.push(makeCard(topic, difficulty, LANGUAGE, i));
      }
    }
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const output = path.join(rawDir, `generated.refresh.${stamp}.raw.json`);
  writeJson(output, allCards);

  writeJson(path.join(rawDir, 'invalid.sample.raw.json'), [
    {
      id: 'invalid-1',
      topic: 'Math',
      language: 'zz_XX',
      question: 'Broken sample',
      options: ['A', 'B'],
      source: 'invalid-fixture'
    }
  ]);

  console.log(`Generated ${allCards.length} raw cards -> ${path.relative(root, output)}`);
  console.log(`Target per key: ${targetPerKey} (architecture-ready for 1000 via --target-per-key=1000)`);
}

main();