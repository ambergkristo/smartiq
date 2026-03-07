#!/usr/bin/env node
/* eslint-disable no-console */

const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || '';
const DEFAULT_INTERNAL_API_KEY =
  process.env.SMARTIQ_INTERNAL_API_KEY ||
  process.env.INTERNAL_API_KEY ||
  process.env.X_INTERNAL_API_KEY ||
  '';

function parseArg(args, prefix) {
  const hit = args.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : '';
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function isoAtOffset(base, dayOffset, minuteOffset) {
  return new Date(base.getTime() + (dayOffset * 24 * 60 + minuteOffset) * 60 * 1000).toISOString();
}

function buildSeedPlan(now) {
  return [
    {
      slug: 'pilot-recurring-host-acme',
      name: 'Pilot Recurring Host Acme',
      billingEmail: 'billing+pilot-acme@smartiq.test',
      member: {
        email: 'owner+pilot-acme@smartiq.test',
        displayName: 'Pilot Host Acme',
        role: 'owner'
      },
      targetUsageTotals: [
        {
          eventType: 'host.workspace.bootstrapped',
          totalValue: 1,
          eventTime: isoAtOffset(now, -3, 0),
          metadata: {
            ownerEmail: 'owner+pilot-acme@smartiq.test'
          }
        },
        {
          eventType: 'host.auth.completed',
          totalValue: 1,
          eventTime: isoAtOffset(now, -3, 5),
          metadata: {
            userEmail: 'owner+pilot-acme@smartiq.test',
            role: 'owner'
          }
        }
      ]
    },
    {
      slug: 'pilot-recurring-host-birch',
      name: 'Pilot Recurring Host Birch',
      billingEmail: 'billing+pilot-birch@smartiq.test',
      member: {
        email: 'owner+pilot-birch@smartiq.test',
        displayName: 'Pilot Host Birch',
        role: 'owner'
      },
      targetUsageTotals: [
        {
          eventType: 'host.workspace.bootstrapped',
          totalValue: 1,
          eventTime: isoAtOffset(now, -2, 0),
          metadata: {
            ownerEmail: 'owner+pilot-birch@smartiq.test'
          }
        },
        {
          eventType: 'host.auth.completed',
          totalValue: 1,
          eventTime: isoAtOffset(now, -2, 5),
          metadata: {
            userEmail: 'owner+pilot-birch@smartiq.test',
            role: 'owner'
          }
        },
        {
          eventType: 'host.session.started',
          totalValue: 2,
          eventTime: isoAtOffset(now, -2, 10),
          metadata: {
            gameId: 'pilot-birch-session-1',
            topic: 'Demo Night'
          }
        },
        {
          eventType: 'host.session.completed',
          totalValue: 2,
          eventTime: isoAtOffset(now, -2, 20),
          metadata: {
            gameId: 'pilot-birch-session-1',
            winnerDisplayName: 'Team Birch',
            winnerScore: 24,
            roundNumber: 10,
            topic: 'Demo Night'
          }
        }
      ]
    },
    {
      slug: 'pilot-recurring-host-cinder',
      name: 'Pilot Recurring Host Cinder',
      billingEmail: 'billing+pilot-cinder@smartiq.test',
      member: {
        email: 'owner+pilot-cinder@smartiq.test',
        displayName: 'Pilot Host Cinder',
        role: 'owner'
      },
      targetUsageTotals: [
        {
          eventType: 'host.workspace.bootstrapped',
          totalValue: 1,
          eventTime: isoAtOffset(now, -1, 0),
          metadata: {
            ownerEmail: 'owner+pilot-cinder@smartiq.test'
          }
        },
        {
          eventType: 'host.auth.completed',
          totalValue: 1,
          eventTime: isoAtOffset(now, -1, 5),
          metadata: {
            userEmail: 'owner+pilot-cinder@smartiq.test',
            role: 'owner'
          }
        },
        {
          eventType: 'host.session.started',
          totalValue: 1,
          eventTime: isoAtOffset(now, -1, 10),
          metadata: {
            gameId: 'pilot-cinder-session-1',
            topic: 'Launch Rehearsal'
          }
        },
        {
          eventType: 'host.session.resumed',
          totalValue: 1,
          eventTime: isoAtOffset(now, -1, 15),
          metadata: {
            gameId: 'pilot-cinder-session-1',
            userEmail: 'owner+pilot-cinder@smartiq.test'
          }
        }
      ]
    }
  ];
}

async function requestJson(baseUrl, internalApiKey, method, pathname, body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Api-Key': internalApiKey
    },
    body: body == null ? undefined : JSON.stringify(body)
  });

  const text = await response.text();
  const payload = text ? safeParseJson(text) : null;
  if (!response.ok) {
    const detail = payload ? JSON.stringify(payload) : text;
    throw new Error(`${method} ${pathname} failed: ${response.status} ${detail}`);
  }
  return payload;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listTenants(baseUrl, internalApiKey, query) {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const payload = await requestJson(baseUrl, internalApiKey, 'GET', `/internal/wl/tenants${suffix}`);
  return Array.isArray(payload) ? payload : [];
}

async function listMembers(baseUrl, internalApiKey, tenantId) {
  const payload = await requestJson(baseUrl, internalApiKey, 'GET', `/internal/wl/tenants/${tenantId}/members`);
  return Array.isArray(payload) ? payload : [];
}

async function getUsageSummary(baseUrl, internalApiKey, tenantId) {
  const payload = await requestJson(baseUrl, internalApiKey, 'GET', `/internal/wl/tenants/${tenantId}/usage-summary`);
  return Array.isArray(payload) ? payload : [];
}

async function getPilotSummary(baseUrl, internalApiKey, tenantId) {
  return requestJson(baseUrl, internalApiKey, 'GET', `/internal/wl/tenants/${tenantId}/pilot-summary`);
}

async function ensureTenant(baseUrl, internalApiKey, tenantPlan, apply) {
  const tenants = await listTenants(baseUrl, internalApiKey, tenantPlan.slug);
  const exactMatch = tenants.find((tenant) => tenant.slug === tenantPlan.slug);
  if (exactMatch) {
    if (exactMatch.status !== 'active') {
      throw new Error(`Existing tenant ${tenantPlan.slug} is not active; refusing to mutate suspended tenant.`);
    }
    console.log(`[seed] tenant exists slug=${tenantPlan.slug} tenantId=${exactMatch.tenantId}`);
    return exactMatch;
  }

  if (!apply) {
    console.log(`[dry-run] would create tenant slug=${tenantPlan.slug} name=${tenantPlan.name}`);
    return { tenantId: `<planned:${tenantPlan.slug}>`, slug: tenantPlan.slug, name: tenantPlan.name, status: 'active' };
  }

  const created = await requestJson(baseUrl, internalApiKey, 'POST', '/internal/wl/tenants', {
    slug: tenantPlan.slug,
    name: tenantPlan.name,
    billingEmail: tenantPlan.billingEmail
  });
  console.log(`[seed] created tenant slug=${tenantPlan.slug} tenantId=${created.tenantId}`);
  return created;
}

async function ensureOwnerMember(baseUrl, internalApiKey, tenantId, tenantPlan, apply) {
  const members = await listMembers(baseUrl, internalApiKey, tenantId);
  const existing = members.find((member) => member.email === tenantPlan.member.email);
  if (existing) {
    if (existing.role !== 'owner' || existing.status !== 'active') {
      throw new Error(
        `Existing member ${tenantPlan.member.email} on tenant ${tenantPlan.slug} is not an active owner; refusing to auto-correct.`
      );
    }
    console.log(`[seed] owner exists tenant=${tenantPlan.slug} email=${tenantPlan.member.email}`);
    return existing;
  }

  if (!apply) {
    console.log(`[dry-run] would add owner member tenant=${tenantPlan.slug} email=${tenantPlan.member.email}`);
    return { membershipId: `<planned:${tenantPlan.member.email}>` };
  }

  const created = await requestJson(baseUrl, internalApiKey, 'POST', `/internal/wl/tenants/${tenantId}/members`, tenantPlan.member);
  console.log(`[seed] added owner tenant=${tenantPlan.slug} email=${tenantPlan.member.email} membershipId=${created.membershipId}`);
  return created;
}

function summarizeUsageRows(rows) {
  const map = new Map();
  for (const row of rows) {
    map.set(row.eventType, row.totalValue || 0);
  }
  return map;
}

async function ensureUsage(baseUrl, internalApiKey, tenantId, tenantPlan, apply) {
  const usageRows = await getUsageSummary(baseUrl, internalApiKey, tenantId);
  const usageTotals = summarizeUsageRows(usageRows);

  for (const target of tenantPlan.targetUsageTotals) {
    const currentValue = usageTotals.get(target.eventType) || 0;
    if (currentValue >= target.totalValue) {
      console.log(`[seed] usage already sufficient tenant=${tenantPlan.slug} eventType=${target.eventType} total=${currentValue}`);
      continue;
    }

    const delta = target.totalValue - currentValue;
    if (!apply) {
      console.log(`[dry-run] would create usage event tenant=${tenantPlan.slug} eventType=${target.eventType} delta=${delta}`);
      continue;
    }

    await requestJson(baseUrl, internalApiKey, 'POST', `/internal/wl/tenants/${tenantId}/usage-events`, {
      eventType: target.eventType,
      eventValue: delta,
      eventTime: target.eventTime,
      metadata: target.metadata
    });
    console.log(`[seed] created usage event tenant=${tenantPlan.slug} eventType=${target.eventType} delta=${delta}`);
  }
}

async function printVerification(baseUrl, internalApiKey, seedPlan, apply) {
  if (!apply) {
    console.log('[dry-run] expected seeded aggregate after apply: totalTenants>=3 activeTenants>=3 activatedHosts>=3 repeatHosts>=2 paidConversions>=0');
    return;
  }

  let activatedHosts = 0;
  let repeatHosts = 0;
  let paidConversions = 0;

  for (const tenantPlan of seedPlan) {
    const tenants = await listTenants(baseUrl, internalApiKey, tenantPlan.slug);
    const tenant = tenants.find((item) => item.slug === tenantPlan.slug);
    if (!tenant) {
      throw new Error(`Verification failed: tenant ${tenantPlan.slug} not found after apply.`);
    }
    const summary = await getPilotSummary(baseUrl, internalApiKey, tenant.tenantId);
    activatedHosts += summary.activated ? 1 : 0;
    repeatHosts += summary.repeatHost ? 1 : 0;
    paidConversions += summary.paidConverted ? 1 : 0;
    console.log(`[verify] tenant=${tenantPlan.slug} activated=${summary.activated} repeatHost=${summary.repeatHost} paidConverted=${summary.paidConverted}`);
  }

  console.log(`[verify] seeded aggregate totalTenants=3 activeTenants=3 activatedHosts=${activatedHosts} repeatHosts=${repeatHosts} paidConversions=${paidConversions}`);
}

async function main() {
  const args = process.argv.slice(2);
  const backendUrl = trimTrailingSlash(parseArg(args, '--backend-url=') || DEFAULT_BACKEND_URL);
  const internalApiKey = parseArg(args, '--internal-api-key=') || DEFAULT_INTERNAL_API_KEY;
  const apply = hasFlag(args, '--apply');

  if (!backendUrl) {
    throw new Error('Missing --backend-url or BACKEND_URL.');
  }
  if (!internalApiKey) {
    throw new Error('Missing --internal-api-key or SMARTIQ_INTERNAL_API_KEY.');
  }

  const seedPlan = buildSeedPlan(new Date());
  console.log(apply
    ? `[seed] applying recurring-host pilot bootstrap against ${backendUrl}`
    : `[dry-run] previewing recurring-host pilot bootstrap against ${backendUrl}`);

  for (const tenantPlan of seedPlan) {
    const tenant = await ensureTenant(backendUrl, internalApiKey, tenantPlan, apply);
    const tenantId = tenant.tenantId;
    if (!String(tenantId).startsWith('<planned:')) {
      await ensureOwnerMember(backendUrl, internalApiKey, tenantId, tenantPlan, apply);
      await ensureUsage(backendUrl, internalApiKey, tenantId, tenantPlan, apply);
    } else {
      console.log(`[dry-run] would verify owner and usage for tenant=${tenantPlan.slug}`);
    }
  }

  await printVerification(backendUrl, internalApiKey, seedPlan, apply);
  console.log(apply ? '[seed] recurring-host pilot bootstrap completed' : '[dry-run] no live changes were made');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
