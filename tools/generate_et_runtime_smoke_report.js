#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function nowIso() {
  return new Date().toISOString();
}

function nowStamp() {
  return nowIso().replace(/[:]/g, '-').replace(/\.\d{3}Z$/, 'Z');
}

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function run(command, args, env) {
  return spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

function main() {
  const args = process.argv.slice(2);
  const outArg = parseArg(args, '--out=');
  const backendArg = parseArg(args, '--backend-url=');
  const topicArg = parseArg(args, '--topic=');
  const gameIdArg = parseArg(args, '--game-id=');
  const langArg = parseArg(args, '--language=');

  const backendUrl = backendArg || (process.env.BACKEND_URL || '').trim();
  if (!backendUrl) {
    console.error('BACKEND_URL is required (or pass --backend-url=...).');
    process.exit(1);
  }

  const smokeEnv = {
    BACKEND_URL: backendUrl,
    SMOKE_LANGUAGE: langArg || process.env.SMOKE_LANGUAGE || 'et'
  };
  if (topicArg) smokeEnv.SMOKE_TOPIC = topicArg;
  if (gameIdArg) smokeEnv.SMOKE_GAME_ID = gameIdArg;

  const outPath = path.resolve(
    process.cwd(),
    outArg || `docs/reports/et-runtime-smoke-${nowStamp()}.md`
  );

  const branch = run('git', ['branch', '--show-current'], {}).stdout.trim() || 'unknown';
  const sha = run('git', ['rev-parse', '--short', 'HEAD'], {}).stdout.trim() || 'unknown';
  const command = 'node tools/smoke-test.js';
  const smoke = run('node', ['tools/smoke-test.js'], smokeEnv);
  const pass = smoke.status === 0;
  const output = [smoke.stdout?.trim(), smoke.stderr?.trim()].filter(Boolean).join('\n') || '(no output)';

  const report = [
    '# ET Runtime Smoke Report',
    '',
    '## Metadata',
    '',
    `- Date: ${nowIso()}`,
    `- Branch: ${branch}`,
    `- Commit SHA: ${sha}`,
    `- Backend URL: ${backendUrl}`,
    `- Language: ${smokeEnv.SMOKE_LANGUAGE}`,
    `- Topic override: ${smokeEnv.SMOKE_TOPIC || '(auto)'}`,
    `- GameId override: ${smokeEnv.SMOKE_GAME_ID || '(auto)'}`,
    '',
    '## Command',
    '',
    `- \`${command}\``,
    '',
    '## Result',
    '',
    `- Status: ${pass ? 'PASS' : 'FAIL'}`,
    '',
    '```text',
    output,
    '```',
    ''
  ].join('\n');

  ensureDir(outPath);
  fs.writeFileSync(outPath, report, 'utf8');

  console.log(`ET runtime smoke report written: ${outPath}`);
  console.log(`Overall status: ${pass ? 'PASS' : 'FAIL'}`);

  if (!pass) {
    process.exit(1);
  }
}

main();
