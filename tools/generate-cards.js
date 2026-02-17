#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const TOPICS = ['Math', 'Science', 'History'];
const DIFFICULTIES = ['1', '2', '3'];
const DEFAULT_TARGET_PER_KEY = Number(process.env.TARGET_PER_KEY || 50);
const LANGUAGE = process.env.GEN_LANG || 'en';
const MAX_GENERATION_PER_RUN = Number(process.env.MAX_GENERATION_PER_RUN || 10000);
const MAX_DAILY_GENERATION = Number(process.env.MAX_DAILY_GENERATION || 10000);

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

function readBudgetState(statePath) {
  if (!fs.existsSync(statePath)) {
    return { date: null, used: 0 };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    return {
      date: parsed.date || null,
      used: Number.isInteger(parsed.used) ? parsed.used : 0
    };
  } catch (err) {
    console.warn(`Budget state unreadable (${statePath}), resetting: ${err.message}`);
    return { date: null, used: 0 };
  }
}

function enforceGenerationBudgets(root, plannedCount) {
  if (plannedCount > MAX_GENERATION_PER_RUN) {
    throw new Error(
      `Generation request ${plannedCount} exceeds MAX_GENERATION_PER_RUN=${MAX_GENERATION_PER_RUN}`
    );
  }

  const reviewDir = path.join(root, 'data', 'review');
  if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
  const statePath = path.join(reviewDir, 'generation-budget.json');
  const nowDate = new Date().toISOString().slice(0, 10);
  const state = readBudgetState(statePath);
  const usedToday = state.date === nowDate ? state.used : 0;

  if (usedToday + plannedCount > MAX_DAILY_GENERATION) {
    throw new Error(
      `Daily generation budget exceeded: used=${usedToday}, planned=${plannedCount}, MAX_DAILY_GENERATION=${MAX_DAILY_GENERATION}`
    );
  }

  const nextState = {
    date: nowDate,
    used: usedToday + plannedCount,
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(statePath, `${JSON.stringify(nextState, null, 2)}\n`, 'utf8');
}

function main() {
  const targetPerKey = parseTarget();
  const root = process.cwd();
  const rawDir = path.join(root, 'data', 'raw');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir, { recursive: true });
  if (!process.env.OPENAI_API_KEY) {
    console.warn('OPENAI_API_KEY is not set. Falling back to deterministic local generator.');
  }

  const plannedCount = TOPICS.length * DIFFICULTIES.length * targetPerKey;
  enforceGenerationBudgets(root, plannedCount);

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
  console.log(`Budget check: MAX_GENERATION_PER_RUN=${MAX_GENERATION_PER_RUN}, MAX_DAILY_GENERATION=${MAX_DAILY_GENERATION}`);
}

main();
