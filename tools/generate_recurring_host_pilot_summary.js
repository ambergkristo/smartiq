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

function hasFlag(args, flag) {
  return args.includes(flag);
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJsonFile(filePath, payload) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function readNumberArg(args, prefix, envKey, fallback) {
  const raw = parseArg(args, prefix) || process.env[envKey] || '';
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Invalid value for ${prefix}: ${raw}`);
  }
  return parsed;
}

function formatStage(summary) {
  if (summary?.paidConverted) {
    return 'Paid';
  }
  if (summary?.repeatHost) {
    return 'Repeat host';
  }
  if (summary?.activated) {
    return 'Activated';
  }
  return 'Not started';
}

function formatLabel(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || 'n/a';
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function buildMarkdown({
  generatedAt,
  backendUrl,
  source,
  thresholdStatus,
  thresholds,
  aggregate,
  tenants
}) {
  const sourceLine = source === 'snapshot'
    ? `Snapshot source: \`${backendUrl}\``
    : `Backend source: \`${backendUrl}\``;
  const tenantLines = tenants.length === 0
    ? ['No active tenants were found in the selected source.']
    : tenants.map((entry) => {
      const supportSummary = entry.supportCases.length === 0
        ? '0 open / 0 resolved'
        : `${entry.openSupportCases} open / ${entry.resolvedSupportCases} resolved`;
      return [
        `### ${entry.tenant.name}`,
        `- Tenant: \`${entry.tenant.tenantId}\``,
        `- Stage: ${formatStage(entry.pilotSummary)}`,
        `- Risk: ${formatLabel(entry.pilotSummary?.riskStatus)}`,
        `- Plan: ${entry.pilotSummary?.planCode || 'n/a'} | ${entry.pilotSummary?.subscriptionStatus || 'n/a'}`,
        `- Metrics: launches=${entry.pilotSummary?.sessionLaunches ?? 0}, completed=${entry.pilotSummary?.completedSessions ?? 0}, upgrade_attempts=${entry.pilotSummary?.upgradeAttempts ?? 0}, paid_activations=${entry.pilotSummary?.paidActivations ?? 0}`,
        `- Support: ${supportSummary}`,
        `- Recommendation: ${entry.pilotSummary?.recommendation || 'n/a'}`
      ].join('\n');
    });

  return `---
title: Recurring host SaaS pilot summary
type: report
status: active
date: ${todayStamp()}
track: recurring-host-saas
milestone: M6
---

# Recurring Host SaaS Pilot Summary

## Metadata

- Generated at: \`${generatedAt}\`
- ${sourceLine}
- Threshold status: \`${thresholdStatus}\`

## Aggregate

- Tenants reviewed: \`${aggregate.totalTenants}\`
- Active tenants: \`${aggregate.activeTenants}\`
- Suspended tenants: \`${aggregate.suspendedTenants}\`
- Activated hosts: \`${aggregate.activatedHosts}\`
- Repeat hosts: \`${aggregate.repeatHosts}\`
- Paid conversions: \`${aggregate.paidConversions}\`
- Open support cases: \`${aggregate.openSupportCases}\`
- Resolved support cases: \`${aggregate.resolvedSupportCases}\`
- Top open support category: \`${aggregate.topOpenSupportCategory || 'n/a'}\`

## Thresholds

- Activated hosts target: \`${aggregate.activatedHosts}\` / \`${thresholds.minActivatedHosts}\`
- Repeat hosts target: \`${aggregate.repeatHosts}\` / \`${thresholds.minRepeatHosts}\`
- Paid conversions target: \`${aggregate.paidConversions}\` / \`${thresholds.minPaidConversions}\`

## Risk Mix

${aggregate.riskLines.map((line) => `- ${line}`).join('\n')}

## Tenant Breakdown

${tenantLines.join('\n\n')}
`;
}

async function fetchJson(baseUrl, apiKey, pathname) {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}${pathname}`, {
    headers: {
      'X-Internal-Api-Key': apiKey
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed for ${pathname}: ${response.status} ${text.slice(0, 160)}`);
  }

  return response.json();
}

async function loadLiveSource(baseUrl, apiKey) {
  const tenants = await fetchJson(baseUrl, apiKey, '/internal/wl/tenants');
  const normalizedTenants = Array.isArray(tenants) ? tenants : [];
  const enriched = await Promise.all(normalizedTenants.map(async (tenant) => {
    const [pilotSummary, supportCases] = await Promise.all([
      fetchJson(baseUrl, apiKey, `/internal/wl/tenants/${encodeURIComponent(tenant.tenantId)}/pilot-summary`),
      fetchJson(baseUrl, apiKey, `/internal/wl/tenants/${encodeURIComponent(tenant.tenantId)}/support-cases`)
    ]);
    return {
      tenant,
      pilotSummary: pilotSummary || {},
      supportCases: Array.isArray(supportCases) ? supportCases : []
    };
  }));
  return {
    source: 'live',
    backendUrl: baseUrl,
    generatedAt: nowIso(),
    tenants: enriched
  };
}

function loadSnapshotSource(snapshotPath) {
  const payload = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  return {
    source: 'snapshot',
    backendUrl: snapshotPath.replace(/\\/g, '/'),
    generatedAt: payload.generatedAt || nowIso(),
    tenants: Array.isArray(payload.tenants) ? payload.tenants : []
  };
}

function aggregateData(sourceData) {
  const tenants = sourceData.tenants.map((entry) => {
    const supportCases = Array.isArray(entry.supportCases) ? entry.supportCases : [];
    const openSupportCases = supportCases.filter((item) => item.status !== 'resolved').length;
    const resolvedSupportCases = supportCases.filter((item) => item.status === 'resolved').length;
    return {
      tenant: entry.tenant || {},
      pilotSummary: entry.pilotSummary || {},
      supportCases,
      openSupportCases,
      resolvedSupportCases
    };
  });

  const aggregate = {
    totalTenants: tenants.length,
    activeTenants: tenants.filter((entry) => entry.tenant.status === 'active').length,
    suspendedTenants: tenants.filter((entry) => entry.tenant.status === 'suspended').length,
    activatedHosts: tenants.filter((entry) => entry.pilotSummary.activated).length,
    repeatHosts: tenants.filter((entry) => entry.pilotSummary.repeatHost).length,
    paidConversions: tenants.filter((entry) => entry.pilotSummary.paidConverted).length,
    openSupportCases: sum(tenants, (entry) => entry.openSupportCases),
    resolvedSupportCases: sum(tenants, (entry) => entry.resolvedSupportCases),
    topOpenSupportCategory: null,
    riskLines: []
  };

  const categoryCounts = new Map();
  const riskCounts = new Map();
  tenants.forEach((entry) => {
    const risk = entry.pilotSummary?.riskStatus || 'tracking';
    riskCounts.set(risk, (riskCounts.get(risk) || 0) + 1);
    entry.supportCases
      .filter((item) => item.status !== 'resolved')
      .forEach((item) => {
        const category = item.category || 'general';
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      });
  });

  aggregate.topOpenSupportCategory = Array.from(categoryCounts.entries())
    .sort((left, right) => right[1] - left[1])[0]?.[0] || null;
  aggregate.riskLines = Array.from(riskCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([risk, count]) => `\`${formatLabel(risk)}\`: \`${count}\``);
  if (aggregate.riskLines.length === 0) {
    aggregate.riskLines.push('`Tracking`: `0`');
  }

  return { aggregate, tenants };
}

async function main() {
  const args = process.argv.slice(2);
  const snapshotPath = parseArg(args, '--snapshot=');
  const backendUrl = parseArg(args, '--backend-url=') || process.env.BACKEND_URL || '';
  const internalApiKey =
    parseArg(args, '--internal-api-key=') ||
    process.env.SMARTIQ_INTERNAL_API_KEY ||
    process.env.INTERNAL_API_KEY ||
    process.env.X_INTERNAL_API_KEY ||
    '';
  const outputPath = parseArg(args, '--output=') || `docs/reports/recurring-host-pilot-summary-${todayStamp()}.md`;
  const jsonOutputPath = parseArg(args, '--json-output=');
  const thresholds = {
    minActivatedHosts: readNumberArg(args, '--min-activated-hosts=', 'SMARTIQ_M6_MIN_ACTIVATED_HOSTS', 10),
    minRepeatHosts: readNumberArg(args, '--min-repeat-hosts=', 'SMARTIQ_M6_MIN_REPEAT_HOSTS', 5),
    minPaidConversions: readNumberArg(args, '--min-paid-conversions=', 'SMARTIQ_M6_MIN_PAID_CONVERSIONS', 0)
  };

  let sourceData;
  if (snapshotPath) {
    sourceData = loadSnapshotSource(snapshotPath);
  } else {
    if (!backendUrl) {
      throw new Error('Missing --backend-url or BACKEND_URL.');
    }
    if (!internalApiKey) {
      throw new Error('Missing --internal-api-key or SMARTIQ_INTERNAL_API_KEY.');
    }
    sourceData = await loadLiveSource(backendUrl, internalApiKey);
  }

  const { aggregate, tenants } = aggregateData(sourceData);
  const thresholdStatus =
    aggregate.activatedHosts >= thresholds.minActivatedHosts &&
    aggregate.repeatHosts >= thresholds.minRepeatHosts &&
    aggregate.paidConversions >= thresholds.minPaidConversions
      ? 'READY'
      : 'NOT_YET';

  const report = buildMarkdown({
    generatedAt: sourceData.generatedAt,
    backendUrl: sourceData.backendUrl,
    source: sourceData.source,
    thresholdStatus,
    thresholds,
    aggregate,
    tenants
  });

  ensureDir(outputPath);
  fs.writeFileSync(outputPath, report);
  const summaryPayload = {
    generatedAt: sourceData.generatedAt,
    source: sourceData.source,
    sourceRef: sourceData.backendUrl,
    thresholdStatus,
    thresholds,
    aggregate,
    tenantCount: tenants.length,
    tenants: tenants.map((entry) => ({
      tenantId: entry.tenant.tenantId || '',
      tenantName: entry.tenant.name || '',
      tenantStatus: entry.tenant.status || '',
      planCode: entry.pilotSummary?.planCode || '',
      subscriptionStatus: entry.pilotSummary?.subscriptionStatus || '',
      riskStatus: entry.pilotSummary?.riskStatus || 'tracking',
      recommendation: entry.pilotSummary?.recommendation || '',
      topOpenSupportCategory: entry.pilotSummary?.topOpenSupportCategory || '',
      stage: formatStage(entry.pilotSummary),
      activated: Boolean(entry.pilotSummary?.activated),
      repeatHost: Boolean(entry.pilotSummary?.repeatHost),
      paidConverted: Boolean(entry.pilotSummary?.paidConverted),
      workspaceBootstraps: entry.pilotSummary?.workspaceBootstraps ?? 0,
      hostSignIns: entry.pilotSummary?.hostSignIns ?? 0,
      sessionLaunches: entry.pilotSummary?.sessionLaunches ?? 0,
      duplicateLaunches: entry.pilotSummary?.duplicateLaunches ?? 0,
      resumeActions: entry.pilotSummary?.resumeActions ?? 0,
      completedSessions: entry.pilotSummary?.completedSessions ?? 0,
      upgradeAttempts: entry.pilotSummary?.upgradeAttempts ?? 0,
      paidActivations: entry.pilotSummary?.paidActivations ?? 0,
      openSupportCases: entry.openSupportCases,
      resolvedSupportCases: entry.resolvedSupportCases,
      supportCases: entry.supportCases.map((item) => ({
        caseId: item.caseId || '',
        title: item.title || '',
        category: item.category || '',
        priority: item.priority || '',
        status: item.status || '',
        owner: item.owner || '',
        summary: item.summary || '',
        nextStep: item.nextStep || '',
        resolution: item.resolution || ''
      }))
    }))
  };
  if (jsonOutputPath) {
    writeJsonFile(jsonOutputPath, summaryPayload);
  }
  console.log(`Recurring host pilot summary written: ${outputPath}`);
  if (hasFlag(args, '--print-json')) {
    console.log(JSON.stringify(summaryPayload, null, 2));
  }

  if (hasFlag(args, '--fail-on-below-threshold') && thresholdStatus !== 'READY') {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
