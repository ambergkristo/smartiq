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

function runCommand(command, args) {
  const proc = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  return {
    command: [command, ...args].join(' '),
    code: proc.status ?? 1,
    stdout: proc.stdout || '',
    stderr: proc.stderr || ''
  };
}

function formatResult(result) {
  const status = result.code === 0 ? 'PASS' : 'FAIL';
  const output = [result.stdout.trim(), result.stderr.trim()].filter(Boolean).join('\n');
  return {
    status,
    command: result.command,
    output: output || '(no output)'
  };
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function parseOutPath(args) {
  const outArg = args.find((arg) => arg.startsWith('--out='));
  if (!outArg) {
    return `docs/reports/et-quality-report-${nowStamp()}.md`;
  }
  return outArg.split('=')[1];
}

function includeSmoke(args) {
  return args.includes('--with-smoke');
}

function main() {
  const args = process.argv.slice(2);
  const outPath = path.resolve(process.cwd(), parseOutPath(args));
  const branch = runCommand('git', ['branch', '--show-current']).stdout.trim() || 'unknown';
  const sha = runCommand('git', ['rev-parse', '--short', 'HEAD']).stdout.trim() || 'unknown';

  const checks = [
    runCommand('node', ['tools/validate_cards_v2.js', 'data/smart10/cards.et.json', '--max-warnings=0']),
    runCommand('node', ['tools/validate_locale_packs.js', 'data/smart10']),
    runCommand('node', ['tools/audit_locale_coverage.js', 'data/smart10', '--required=en,et', '--min-per-combo=30']),
    runCommand('node', ['tools/score_cards_quality.js', 'data/smart10/cards.et.json', '--fail-threshold=0.80'])
  ];

  if (includeSmoke(args)) {
    checks.push(runCommand('node', ['tools/smoke-test.js']));
  }

  const formatted = checks.map(formatResult);
  const hasFailure = formatted.some((item) => item.status === 'FAIL');

  const body = [
    '# ET Quality Report',
    '',
    '## Metadata',
    '',
    `- Date: ${nowIso()}`,
    `- Branch: ${branch}`,
    `- Commit SHA: ${sha}`,
    '',
    '## Command Results',
    '',
    ...formatted.flatMap((item) => [
      `### ${item.status} - \`${item.command}\``,
      '',
      '```text',
      item.output,
      '```',
      ''
    ]),
    '## Summary',
    '',
    `- Overall: ${hasFailure ? 'FAIL' : 'PASS'}`,
    ''
  ].join('\n');

  ensureDir(outPath);
  fs.writeFileSync(outPath, body, 'utf8');

  console.log(`ET quality report written: ${outPath}`);
  console.log(`Overall status: ${hasFailure ? 'FAIL' : 'PASS'}`);

  if (hasFailure) {
    process.exit(1);
  }
}

main();
