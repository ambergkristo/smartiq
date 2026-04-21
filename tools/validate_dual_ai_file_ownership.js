#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function parseArg(args, prefix, fallback = '') {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: 'utf8'
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr || `command failed: ${command}`);
  }
  return result.stdout.trim();
}

function normalizeFilePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function startsWithAny(filePath, prefixes) {
  return prefixes.some((prefix) => {
    if (prefix.endsWith('/')) {
      return filePath.startsWith(prefix);
    }
    return filePath === prefix || filePath.startsWith(`${prefix}/`);
  });
}

function main() {
  const args = process.argv.slice(2);
  const team = parseArg(args, '--team=').trim().toLowerCase();
  const base = parseArg(args, '--base=', 'origin/main').trim();
  const policyPath = parseArg(args, '--policy=', 'docs/policies/dual-ai-file-ownership.json').trim();
  const allowSharedLocked = hasFlag(args, '--allow-shared-locked');

  if (!team) {
    console.error('Missing --team=<team-a|team-b>.');
    process.exit(1);
  }

  const policyFile = path.resolve(process.cwd(), policyPath);
  const rawPolicy = fs.readFileSync(policyFile, 'utf8');
  const policy = JSON.parse(rawPolicy);

  const teamPolicy = policy?.teams?.[team];
  if (!teamPolicy) {
    console.error(`Unknown team '${team}'.`);
    process.exit(1);
  }

  const output = run('git', ['diff', '--name-only', `${base}...HEAD`]);
  const changedFiles = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(normalizeFilePath);

  if (changedFiles.length === 0) {
    console.log(`No changed files against ${base}.`);
    process.exit(0);
  }

  const allowed = teamPolicy.allowed || [];
  const forbidden = teamPolicy.forbidden || [];
  const sharedLocked = policy.shared_locked || [];

  const violations = [];
  const touchedSharedLocked = [];

  for (const file of changedFiles) {
    const isSharedLocked = startsWithAny(file, sharedLocked);
    if (isSharedLocked) {
      touchedSharedLocked.push(file);
    }

    if (isSharedLocked && allowSharedLocked) {
      continue;
    }

    if (!startsWithAny(file, allowed)) {
      violations.push({
        file,
        reason: isSharedLocked
          ? 'shared locked file requires explicit coordination'
          : 'outside allowed scope'
      });
      continue;
    }

    if (startsWithAny(file, forbidden)) {
      violations.push({
        file,
        reason: 'matches forbidden scope'
      });
    }
  }

  if (touchedSharedLocked.length > 0) {
    console.log('Shared locked files touched:');
    for (const file of touchedSharedLocked) {
      console.log(`- ${file}`);
    }
  }

  if (violations.length > 0) {
    console.error(`Ownership validation failed for team '${team}':`);
    for (const violation of violations) {
      console.error(`- ${violation.file}: ${violation.reason}`);
    }
    process.exit(2);
  }

  console.log(`Ownership validation passed for team '${team}'.`);
}

main();
