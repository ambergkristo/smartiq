#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const ROOT = process.cwd();
const CANONICAL_PLAN = 'docs/plans/2026-03-06-recurring-host-saas-masterplan-v1.md';
const LEGACY_PLAN = 'docs/plan.md';
const README = 'README.md';
const CONTRIBUTING = 'CONTRIBUTING.md';
const PR_TEMPLATE = '.github/pull_request_template.md';

function readFile(relativePath) {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function requireContains(content, needle, filePath) {
  if (!content.includes(needle)) {
    throw new Error(`Expected "${needle}" in ${filePath}`);
  }
}

function main() {
  const canonical = readFile(CANONICAL_PLAN);
  const legacy = readFile(LEGACY_PLAN);
  const readme = readFile(README);
  const contributing = readFile(CONTRIBUTING);
  const prTemplate = readFile(PR_TEMPLATE);

  requireContains(canonical, 'status: active', CANONICAL_PLAN);
  requireContains(canonical, '# SmartIQ Recurring Host SaaS Masterplan v1', CANONICAL_PLAN);

  requireContains(legacy, CANONICAL_PLAN, LEGACY_PLAN);

  requireContains(readme, CANONICAL_PLAN, README);
  requireContains(readme, 'Canonical Development Priority', README);

  requireContains(contributing, CANONICAL_PLAN, CONTRIBUTING);
  requireContains(contributing, 'masterplan alignment', CONTRIBUTING);

  requireContains(prTemplate, CANONICAL_PLAN, PR_TEMPLATE);
  requireContains(prTemplate, 'Masterplan phase:', PR_TEMPLATE);
  requireContains(prTemplate, 'Masterplan item(s):', PR_TEMPLATE);
  requireContains(prTemplate, 'If deviating, justify and propose plan update:', PR_TEMPLATE);

  const result = {
    ok: true,
    canonicalPlan: CANONICAL_PLAN,
    checks: [
      'canonical plan exists and is active',
      'legacy plan points to canonical plan',
      'README contains canonical development priority',
      'CONTRIBUTING contains masterplan alignment workflow',
      'PR template contains mandatory masterplan alignment fields'
    ]
  };

  console.log(JSON.stringify(result, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
