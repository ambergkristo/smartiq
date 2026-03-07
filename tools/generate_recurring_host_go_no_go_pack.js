#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toInt(value) {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function bucketTenantStages(tenants) {
  return tenants.reduce((acc, tenant) => {
    const key = String(tenant.stage || 'Unknown');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function decide(summary) {
  const aggregate = summary.aggregate || {};
  const realActivatedHosts = toInt(aggregate.realActivatedHosts);
  const realRepeatHosts = toInt(aggregate.realRepeatHosts);
  const realPaidConversions = toInt(aggregate.realPaidConversions);

  if (realPaidConversions >= 3 && realRepeatHosts >= 3 && realActivatedHosts >= 5) {
    return 'GO_NARROW_SCALE';
  }
  if (realActivatedHosts > 0 || realRepeatHosts > 0 || realPaidConversions > 0) {
    return 'CONTINUE_PILOT';
  }
  return 'NO_GO_SELLABLE';
}

function buildMarkdown(summary) {
  const aggregate = summary.aggregate || {};
  const tenants = Array.isArray(summary.tenants) ? summary.tenants : [];
  const decision = decide(summary);
  const stageBuckets = bucketTenantStages(tenants);
  const stageLines = Object.entries(stageBuckets)
    .map(([stage, count]) => `- ${stage}: ${count}`)
    .join('\n') || '- no tenant stage data';
  const riskLines = Array.isArray(aggregate.riskLines) && aggregate.riskLines.length > 0
    ? aggregate.riskLines.map((line) => `- ${line}`).join('\n')
    : '- no risk lines generated';

  const nextStep = decision === 'GO_NARROW_SCALE'
    ? 'Prepare narrow-scale sales motion and broaden acquisition beyond founder-led pilots.'
    : decision === 'CONTINUE_PILOT'
      ? 'Continue pilot mode, close the top friction loops, and do not market broader launch as validated yet.'
      : 'Do not claim sellable SaaS readiness yet; acquire real pilot usage before broadening launch scope.';

  return `# Recurring Host SaaS M8 Go/No-Go Pack

## Decision

- Recommendation: \`${decision}\`
- Generated at: \`${summary.generatedAt || 'unknown'}\`
- Source: \`${summary.source || 'unknown'}\`
- Source ref: \`${summary.sourceRef || 'n/a'}\`

## Evidence Snapshot

- Real activated hosts: \`${toInt(aggregate.realActivatedHosts)}\`
- Real repeat hosts: \`${toInt(aggregate.realRepeatHosts)}\`
- Real paid conversions: \`${toInt(aggregate.realPaidConversions)}\`
- Bootstrap-seeded tenants: \`${toInt(aggregate.bootstrapSeededTenants)}\`
- Real pilot tenants: \`${toInt(aggregate.realPilotTenants)}\`
- Open support cases: \`${toInt(aggregate.openSupportCases)}\`
- Resolved support cases: \`${toInt(aggregate.resolvedSupportCases)}\`
- Threshold status inherited from M6 summary: \`${summary.thresholdStatus || 'unknown'}\`

## Cohort Shape

${stageLines}

## Risk Register

${riskLines}

## Interpretation

1. Bootstrap-seeded cohorts are separated from real pilot proof and do not count toward sellable SaaS validation.
2. The current recommendation is driven by real activation, repeat-host, and paid-conversion evidence only.
3. Support-case volume is treated as a friction proxy, not as proof of market pull.

## Next Step

1. ${nextStep}
`;
}

function main() {
  const args = process.argv.slice(2);
  const summaryPath = parseArg(args, '--summary-json=');
  const outputPath = parseArg(args, '--output=');

  if (!summaryPath || !outputPath) {
    console.error('Usage: node tools/generate_recurring_host_go_no_go_pack.js --summary-json=<path> --output=<path>');
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const markdown = buildMarkdown(summary);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputPath,
    recommendation: decide(summary)
  }, null, 2));
}

main();
