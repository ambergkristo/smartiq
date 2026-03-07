#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

function nowIso() {
  return new Date().toISOString();
}

function todayStamp() {
  return nowIso().slice(0, 10);
}

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function formatLabel(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || 'n/a';
}

function groupCount(tenants, predicate) {
  return tenants.filter(predicate).length;
}

function buildMarkdown(summary) {
  const thresholds = summary.thresholds || {};
  const aggregate = summary.aggregate || {};
  const allTenants = Array.isArray(summary.tenants) ? summary.tenants : [];
  const realTenants = allTenants.filter((tenant) => !tenant.seededBootstrap);
  const onboardingRiskTenants = realTenants.filter((tenant) => !tenant.activated || tenant.riskStatus === 'needs_attention');
  const liveRunRiskTenants = realTenants.filter((tenant) => tenant.riskStatus === 'live_run_friction');
  const billingRiskTenants = realTenants.filter((tenant) => tenant.upgradeAttempts > 0 && !tenant.paidConverted);
  const openSupportTenants = realTenants.filter((tenant) => tenant.openSupportCases > 0);

  return `---
title: Recurring host SaaS launch KPI dashboard
type: report
status: active
date: ${todayStamp()}
track: recurring-host-saas
milestone: M7
---

# Recurring Host SaaS Launch KPI Dashboard

## Metadata

- Generated at: \`${summary.generatedAt || nowIso()}\`
- Source: \`${summary.source || 'unknown'}\`
- Source ref: \`${summary.sourceRef || 'n/a'}\`
- Threshold status inherited from M6 proof: \`${summary.thresholdStatus || 'unknown'}\`

## Launch Scoreboard

- Real pilot tenants: \`${aggregate.realPilotTenants ?? 0}\`
- Real activated hosts: \`${aggregate.realActivatedHosts ?? 0}\` / \`${thresholds.minActivatedHosts ?? 0}\`
- Real repeat hosts: \`${aggregate.realRepeatHosts ?? 0}\` / \`${thresholds.minRepeatHosts ?? 0}\`
- Real paid conversions: \`${aggregate.realPaidConversions ?? 0}\` / \`${thresholds.minPaidConversions ?? 0}\`
- Open support cases: \`${aggregate.openSupportCases ?? 0}\`
- Resolved support cases: \`${aggregate.resolvedSupportCases ?? 0}\`
- Bootstrap-seeded tenants kept out of readiness: \`${aggregate.bootstrapSeededTenants ?? 0}\`

## Incident Watch

- Auth/onboarding watch: \`${onboardingRiskTenants.length}\` real tenants
- Billing watch: \`${billingRiskTenants.length}\` real tenants
- Live-session watch: \`${liveRunRiskTenants.length}\` real tenants
- Support-active tenants: \`${openSupportTenants.length}\`

## Risk Mix

${Array.isArray(aggregate.riskLines) && aggregate.riskLines.length > 0
    ? aggregate.riskLines.map((line) => `- ${line}`).join('\n')
    : '- `Tracking`: `0`'}

## Priority Tenant Watchlist

${realTenants.length === 0
    ? '- No real pilot tenants yet. Launch dashboard currently reflects only bootstrap/tooling readiness.'
    : realTenants
      .slice()
      .sort((left, right) => {
        const leftScore = (left.openSupportCases || 0) * 10 + (left.paidConverted ? 0 : left.upgradeAttempts || 0);
        const rightScore = (right.openSupportCases || 0) * 10 + (right.paidConverted ? 0 : right.upgradeAttempts || 0);
        return rightScore - leftScore;
      })
      .slice(0, 8)
      .map((tenant) => `- \`${tenant.tenantName}\` | stage=\`${tenant.stage}\` | risk=\`${formatLabel(tenant.riskStatus)}\` | launches=\`${tenant.sessionLaunches}\` | completed=\`${tenant.completedSessions}\` | upgrades=\`${tenant.upgradeAttempts}\` | open_support=\`${tenant.openSupportCases}\``)
      .join('\n')}
`;
}

function main() {
  const args = process.argv.slice(2);
  const summaryPath = parseArg(args, '--summary-json=');
  if (!summaryPath) {
    throw new Error('Missing --summary-json path.');
  }

  const outputPath = parseArg(args, '--output=') || `docs/reports/recurring-host-launch-kpi-dashboard-${todayStamp()}.md`;
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const report = buildMarkdown(summary);

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, report);
  console.log(`Recurring host launch KPI dashboard written: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
