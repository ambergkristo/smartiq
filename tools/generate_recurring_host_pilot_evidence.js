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

function chooseTopCases(tenants, predicate, limit = 5) {
  return tenants
    .flatMap((tenant) => tenant.supportCases
      .filter(predicate)
      .map((supportCase) => ({
        tenantName: tenant.tenantName,
        tenantId: tenant.tenantId,
        riskStatus: tenant.riskStatus,
        ...supportCase
      })))
    .sort((left, right) => {
      const leftPriority = left.priority === 'high' ? 0 : left.priority === 'medium' ? 1 : 2;
      const rightPriority = right.priority === 'high' ? 0 : right.priority === 'medium' ? 1 : 2;
      return leftPriority - rightPriority;
    })
    .slice(0, limit);
}

function buildMarkdown(summary) {
  const thresholds = summary.thresholds || {};
  const aggregate = summary.aggregate || {};
  const tenants = Array.isArray(summary.tenants) ? summary.tenants : [];
  const realTenants = tenants.filter((tenant) => !tenant.seededBootstrap);
  const seededTenants = tenants.filter((tenant) => tenant.seededBootstrap);

  const activatedTenants = realTenants.filter((tenant) => tenant.activated);
  const repeatTenants = realTenants.filter((tenant) => tenant.repeatHost);
  const paidTenants = realTenants.filter((tenant) => tenant.paidConverted);
  const onboardingBlockers = chooseTopCases(tenants, (item) => item.status !== 'resolved' && item.category === 'onboarding');
  const upgradeBlockers = chooseTopCases(tenants, (item) => item.status !== 'resolved' && item.category === 'billing');
  const openCases = chooseTopCases(tenants, (item) => item.status !== 'resolved');
  const resolvedCases = chooseTopCases(tenants, (item) => item.status === 'resolved');

  return `---
title: Recurring host SaaS pilot evidence pack
type: report
status: active
date: ${todayStamp()}
track: recurring-host-saas
milestone: M6
---

# Recurring Host SaaS Pilot Evidence Pack

## Metadata

- Generated at: \`${summary.generatedAt || nowIso()}\`
- Source: \`${summary.source || 'unknown'}\`
- Source ref: \`${summary.sourceRef || 'n/a'}\`
- Threshold status: \`${summary.thresholdStatus || 'unknown'}\`

## Outcome Summary

- Bootstrap-seeded tenants: \`${aggregate.bootstrapSeededTenants ?? 0}\`
- Real pilot tenants: \`${aggregate.realPilotTenants ?? 0}\`
- Real activated hosts: \`${aggregate.realActivatedHosts ?? 0}\` / \`${thresholds.minActivatedHosts ?? 0}\`
- Real repeat hosts: \`${aggregate.realRepeatHosts ?? 0}\` / \`${thresholds.minRepeatHosts ?? 0}\`
- Real paid conversions: \`${aggregate.realPaidConversions ?? 0}\` / \`${thresholds.minPaidConversions ?? 0}\`
- Total activated hosts: \`${aggregate.activatedHosts ?? 0}\`
- Total repeat hosts: \`${aggregate.repeatHosts ?? 0}\`
- Total paid conversions: \`${aggregate.paidConversions ?? 0}\`
- Open support cases: \`${aggregate.openSupportCases ?? 0}\`
- Resolved support cases: \`${aggregate.resolvedSupportCases ?? 0}\`

## Cohort Integrity

- Bootstrap cohort: ${seededTenants.length === 0 ? '`none`' : seededTenants.map((tenant) => `\`${tenant.tenantName}\``).join(', ')}
- Real pilot cohort: ${realTenants.length === 0 ? '`none`' : realTenants.map((tenant) => `\`${tenant.tenantName}\``).join(', ')}
- Interpretation: ${seededTenants.length > 0 && realTenants.length === 0
    ? 'current threshold result depends entirely on bootstrap-seeded tenants, so M6 real-host proof is still not satisfied'
    : seededTenants.length > 0
      ? 'bootstrap tenants exist, but real-host counts remain the authoritative M6 threshold'
      : 'all observed tenants are treated as real pilot cohort'}

## Activation Review

- Activated tenants: ${activatedTenants.length === 0 ? '`none`' : activatedTenants.map((tenant) => `\`${tenant.tenantName}\``).join(', ')}
- Highest onboarding friction category: \`${aggregate.topOpenSupportCategory || 'n/a'}\`
- Activation interpretation: ${activatedTenants.length >= (thresholds.minActivatedHosts ?? 0)
    ? 'activation target is met'
    : 'activation target is still below M6 definition of done'}

## Repeat Host Review

- Repeat-host tenants: ${repeatTenants.length === 0 ? '`none`' : repeatTenants.map((tenant) => `\`${tenant.tenantName}\``).join(', ')}
- Repeat-host interpretation: ${repeatTenants.length >= (thresholds.minRepeatHosts ?? 0)
    ? 'repeat-host target is met'
    : 'repeat-host target is still below M6 definition of done'}

## Conversion Review

- Paid-converted tenants: ${paidTenants.length === 0 ? '`none`' : paidTenants.map((tenant) => `\`${tenant.tenantName}\``).join(', ')}
- Upgrade-risk tenants: ${realTenants.filter((tenant) => tenant.upgradeAttempts > 0 && !tenant.paidConverted).length}
- Conversion interpretation: ${paidTenants.length > 0
    ? 'at least one tenant has crossed into paid usage'
    : 'no paid conversion proof exists yet'}

## Highest-Friction Blockers With Owners

${openCases.length === 0
    ? '- No open support blockers recorded.'
    : openCases.map((item) => `- ${item.title} | tenant=\`${item.tenantName}\` | category=\`${formatLabel(item.category)}\` | owner=\`${item.owner || 'unassigned'}\` | next=\`${item.nextStep || 'n/a'}\``).join('\n')}

## Onboarding Blockers

${onboardingBlockers.length === 0
    ? '- No open onboarding blockers recorded.'
    : onboardingBlockers.map((item) => `- ${item.title} | tenant=\`${item.tenantName}\` | owner=\`${item.owner || 'unassigned'}\` | next=\`${item.nextStep || 'n/a'}\``).join('\n')}

## Upgrade Blockers

${upgradeBlockers.length === 0
    ? '- No open upgrade blockers recorded.'
    : upgradeBlockers.map((item) => `- ${item.title} | tenant=\`${item.tenantName}\` | owner=\`${item.owner || 'unassigned'}\` | next=\`${item.nextStep || 'n/a'}\``).join('\n')}

## Recent Fixes

${resolvedCases.length === 0
    ? '- No resolved support cases recorded yet.'
    : resolvedCases.map((item) => `- ${item.title} | tenant=\`${item.tenantName}\` | resolution=\`${item.resolution || item.nextStep || 'n/a'}\``).join('\n')}

## Tenant Notes

${tenants.length === 0
    ? '- No tenants available.'
    : tenants.map((tenant) => `- \`${tenant.tenantName}\` | cohort=\`${tenant.seededBootstrap ? 'bootstrap-seeded' : 'real-pilot'}\` | stage=\`${tenant.stage}\` | risk=\`${formatLabel(tenant.riskStatus)}\` | launches=\`${tenant.sessionLaunches}\` | completed=\`${tenant.completedSessions}\` | upgrades=\`${tenant.upgradeAttempts}\` | paid=\`${tenant.paidActivations}\` | recommendation=${tenant.recommendation || 'n/a'}`).join('\n')}
`;
}

function main() {
  const args = process.argv.slice(2);
  const summaryPath = parseArg(args, '--summary-json=');
  if (!summaryPath) {
    throw new Error('Missing --summary-json path.');
  }

  const outputPath = parseArg(args, '--output=') || `docs/reports/recurring-host-pilot-evidence-${todayStamp()}.md`;
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const report = buildMarkdown(summary);

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, report);
  console.log(`Recurring host pilot evidence written: ${outputPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
