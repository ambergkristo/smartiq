#!/usr/bin/env node
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

function run(command, args, env = {}) {
  const proc = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, ...env }
  });
  return proc.status ?? 1;
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function main() {
  const args = process.argv.slice(2);
  const backendUrl = parseArg(args, '--backend-url=') || (process.env.BACKEND_URL || '').trim();
  const topic = parseArg(args, '--topic=');
  const gameId = parseArg(args, '--game-id=');
  const language = parseArg(args, '--language=') || 'et';

  if (!backendUrl) {
    fail('BACKEND_URL is required. Example: BACKEND_URL=http://localhost:8081 npm run gate:et:release');
  }

  const stamp = nowStamp();
  const qualityOut = `docs/reports/et-quality-report-${stamp}.md`;
  const runtimeOut = `docs/reports/et-runtime-smoke-${stamp}.md`;

  console.log('\n> ET release gate: quality report');
  const qualityStatus = run('node', ['tools/generate_et_quality_report.js', `--out=${qualityOut}`]);
  if (qualityStatus !== 0) {
    fail(`ET release gate failed at quality checks. See ${qualityOut}`, qualityStatus);
  }

  console.log('\n> ET release gate: runtime smoke report');
  const runtimeArgs = [
    'tools/generate_et_runtime_smoke_report.js',
    `--backend-url=${backendUrl}`,
    `--out=${runtimeOut}`,
    `--language=${language}`
  ];
  if (topic) runtimeArgs.push(`--topic=${topic}`);
  if (gameId) runtimeArgs.push(`--game-id=${gameId}`);

  const runtimeStatus = run('node', runtimeArgs);
  if (runtimeStatus !== 0) {
    fail(`ET release gate failed at runtime smoke. See ${runtimeOut}`, runtimeStatus);
  }

  console.log('\nET Release Gate: PASS');
  console.log(`- Quality report: ${qualityOut}`);
  console.log(`- Runtime report: ${runtimeOut}`);
}

main();
