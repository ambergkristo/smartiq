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

function buildPhase(label, focus, targets) {
  return `### ${label}

- Focus: ${focus}
- Targets:
${targets.map((target) => `  - ${target}`).join('\n')}
`;
}

function buildMarkdown(summary) {
  const aggregate = summary.aggregate || {};
  const realActivatedHosts = toInt(aggregate.realActivatedHosts);
  const realRepeatHosts = toInt(aggregate.realRepeatHosts);
  const realPaidConversions = toInt(aggregate.realPaidConversions);
  const topOpenSupportCategory = String(aggregate.topOpenSupportCategory || 'none');

  const q1Targets = [
    `raise real activated hosts from ${realActivatedHosts} to at least 10`,
    `raise real repeat hosts from ${realRepeatHosts} to at least 5`,
    `reduce open support pressure with explicit playbook ownership for ${topOpenSupportCategory}`
  ];
  const q2Targets = [
    `convert real paid hosts from ${realPaidConversions} to at least 3`,
    'lock one repeatable niche segment and a narrow outbound/referral motion',
    'turn founder-assisted onboarding notes into productized self-serve improvements'
  ];
  const q3Targets = [
    'deepen host workspace usage with faster repeat-event setup and better post-session review',
    'stabilize support operations around recurring-host incident patterns',
    'prepare team/agency expansion only after repeat-host evidence remains stable'
  ];
  const q4Targets = [
    'expand content freshness and host retention levers without breaking the narrow ICP',
    'publish a realistic revenue and retention review using real paying-host data',
    'decide whether to stay narrow, scale the wedge, or branch into team/agency packaging'
  ];

  return `# Recurring Host SaaS 12-Month Operating Plan

## Baseline

- Generated at: \`${summary.generatedAt || 'unknown'}\`
- Source: \`${summary.source || 'unknown'}\`
- Real activated hosts: \`${realActivatedHosts}\`
- Real repeat hosts: \`${realRepeatHosts}\`
- Real paid conversions: \`${realPaidConversions}\`
- Open support category focus: \`${topOpenSupportCategory}\`

## Operating Intent

1. Keep the ICP narrow until real repeat-host and paid-conversion evidence exists.
2. Product work should stay biased toward repeat usage, support-load reduction, and pricing clarity.
3. Do not broaden acquisition faster than the product can retain recurring hosts.

${buildPhase('Months 1-3', 'Activation and pilot proof', q1Targets)}
${buildPhase('Months 4-6', 'Paid conversion and segment lock', q2Targets)}
${buildPhase('Months 7-9', 'Repeat-host depth and operational hardening', q3Targets)}
${buildPhase('Months 10-12', 'Retention-led scale decision', q4Targets)}

## Guardrails

1. If real paid conversions remain below 3 after quarter 2, keep the company in pilot mode.
2. If support load rises faster than repeat-host growth, prioritize product friction fixes over acquisition.
3. If one segment clearly outperforms others, narrow harder rather than broadening positioning.
`;
}

function main() {
  const args = process.argv.slice(2);
  const summaryPath = parseArg(args, '--summary-json=');
  const outputPath = parseArg(args, '--output=');

  if (!summaryPath || !outputPath) {
    console.error('Usage: node tools/generate_recurring_host_operating_plan.js --summary-json=<path> --output=<path>');
    process.exit(1);
  }

  const summary = readJson(summaryPath);
  const markdown = buildMarkdown(summary);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf8');
  console.log(JSON.stringify({
    ok: true,
    outputPath
  }, null, 2));
}

main();
