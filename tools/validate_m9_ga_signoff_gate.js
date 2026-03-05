#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const requiredReports = [
  'docs/plans/2026-03-05-m3-auth-tenant-isolation-report.md',
  'docs/plans/2026-03-05-m4-runtime-white-label-report.md',
  'docs/plans/2026-03-05-m5-admin-ops-readiness-report.md',
  'docs/plans/2026-03-05-m6-billing-usage-guardrails-report.md',
  'docs/plans/2026-03-05-m7-production-reliability-report.md',
  'docs/plans/2026-03-05-m8-launch-readiness-report.md'
];

const milestoneDocPath = 'docs/plans/2026-03-05-white-label-milestones-v3.md';

function read(relativePath) {
  const absolutePath = path.resolve(process.cwd(), relativePath);
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
  for (const reportPath of requiredReports) {
    read(reportPath);
  }

  const milestoneDoc = read(milestoneDocPath);

  requireContains(
    milestoneDoc,
    '| M3 | S3 | Auth + tenant isolation hardening | auth/isolation suite green | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );
  requireContains(
    milestoneDoc,
    '| M4 | S4 | Runtime white-label behavior | tenant branding works without redeploy | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );
  requireContains(
    milestoneDoc,
    '| M5 | S5 | Admin operations readiness | admin flows and role safety stable | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );
  requireContains(
    milestoneDoc,
    '| M6 | S6 | Billing + usage guardrails | deterministic limits and usage reporting | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );
  requireContains(
    milestoneDoc,
    '| M7 | S7 | Production reliability | observability + reliability gates green | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );
  requireContains(
    milestoneDoc,
    '| M8 | S8 | Launch readiness | release/rollback/runbook gates green | DONE (gate pass, 2026-03-05) |',
    milestoneDocPath
  );

  const output = {
    ok: true,
    gate: 'M9_GA_SIGNOFF',
    checks: [
      'required milestone reports (M3-M8) exist',
      'milestones document confirms M3-M8 are DONE'
    ]
  };

  console.log(JSON.stringify(output, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message || String(error));
  process.exit(1);
}
