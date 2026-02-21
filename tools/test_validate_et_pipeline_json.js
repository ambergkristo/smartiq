#!/usr/bin/env node
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

function extractLastJsonObject(stdout) {
  const text = String(stdout || '').trim();
  for (let i = text.lastIndexOf('{'); i >= 0; i = text.lastIndexOf('{', i - 1)) {
    const candidate = text.slice(i).trim();
    try {
      return JSON.parse(candidate);
    } catch (_error) {
      // continue scanning backwards
    }
  }
  return null;
}

function hasOwnPath(obj, pathParts) {
  let cursor = obj;
  for (const part of pathParts) {
    if (!cursor || typeof cursor !== 'object' || !Object.prototype.hasOwnProperty.call(cursor, part)) {
      return false;
    }
    cursor = cursor[part];
  }
  return true;
}

function main() {
  const scriptPath = path.resolve(__dirname, 'validate_et_pipeline.js');
  const proc = spawnSync(
    process.execPath,
    [scriptPath, 'data/smart10', '--json', '--quiet'],
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );

  if ((proc.status ?? 1) !== 0) {
    if (proc.error) {
      process.stderr.write(`spawn error: ${proc.error.message}\n`);
    }
    process.stderr.write(proc.stdout || '');
    process.stderr.write(proc.stderr || '');
    throw new Error(`validate_et_pipeline exited with status ${proc.status}`);
  }

  const summary = extractLastJsonObject(proc.stdout);
  assert(summary, 'Could not parse final JSON summary from validate_et_pipeline output');
  assert.strictEqual(typeof summary.ok, 'boolean', 'summary.ok must be a boolean');
  assert.strictEqual(summary.ok, true, 'summary.ok must be true in smoke run');
  assert.strictEqual(summary.exitCode, 0, 'summary.exitCode must be 0');
  assert.strictEqual(typeof summary.totalDurationMs, 'number', 'summary.totalDurationMs must be a number');
  assert(Array.isArray(summary.steps), 'summary.steps must be an array');
  assert(summary.steps.length >= 5, 'summary.steps must include all ET pipeline checks');

  assert(hasOwnPath(summary, ['meta', 'pipelineVersion']), 'summary.meta.pipelineVersion missing');
  assert(hasOwnPath(summary, ['meta', 'generatedAt']), 'summary.meta.generatedAt missing');
  assert(hasOwnPath(summary, ['meta', 'runnerCwd']), 'summary.meta.runnerCwd missing');
  assert(hasOwnPath(summary, ['meta', 'nodeVersion']), 'summary.meta.nodeVersion missing');
  assert(hasOwnPath(summary, ['hashes', 'etCardsSha256']), 'summary.hashes.etCardsSha256 missing');
  assert(hasOwnPath(summary, ['hashes', 'overridesSha256']), 'summary.hashes.overridesSha256 missing');
  assert(
    Object.prototype.hasOwnProperty.call(summary, 'summaryOutputPath'),
    'summary.summaryOutputPath missing'
  );
  assert(
    Object.prototype.hasOwnProperty.call(summary, 'summaryWriteError'),
    'summary.summaryWriteError missing'
  );

  console.log('ET pipeline JSON summary smoke test passed.');
}

main();
