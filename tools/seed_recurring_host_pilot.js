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

function buildTenantPlan(now, config) {
  const usage = [
    {
      eventType: 'host.workspace.bootstrapped',
      totalValue: 1,
      eventTime: isoAtOffset(now, config.dayOffset, 0),
      metadata: {
        ownerEmail: config.ownerEmail
      }
    },
    {
      eventType: 'host.auth.completed',
      totalValue: 1,
      eventTime: isoAtOffset(now, config.dayOffset, 5),
      metadata: {
        userEmail: config.ownerEmail,
        role: 'owner'
      }
    }
  ];

  if (config.sessionLaunches > 0) {
    usage.push({
      eventType: 'host.session.started',
      totalValue: config.sessionLaunches,
      eventTime: isoAtOffset(now, config.dayOffset, 10),
      metadata: {
        gameId: `${config.slug}-session-1`,
        topic: config.topic
      }
    });
  }

  if (config.completedSessions > 0) {
    usage.push({
      eventType: 'host.session.completed',
      totalValue: config.completedSessions,
      eventTime: isoAtOffset(now, config.dayOffset, 20),
      metadata: {
        gameId: `${config.slug}-session-1`,
        winnerDisplayName: config.winnerDisplayName || `Team ${config.label}`,
        winnerScore: config.winnerScore || 24,
        roundNumber: 10,
        topic: config.topic
      }
    });
  }

  if (config.resumeActions > 0) {
    usage.push({
      eventType: 'host.session.resumed',
      totalValue: config.resumeActions,
      eventTime: isoAtOffset(now, config.dayOffset, 15),
      metadata: {
        gameId: `${config.slug}-session-1`,
        userEmail: config.ownerEmail
      }
    });
  }

  if (config.duplicateLaunches > 0) {
    usage.push({
      eventType: 'host.session.duplicated',
      totalValue: config.duplicateLaunches,
      eventTime: isoAtOffset(now, config.dayOffset, 18),
      metadata: {
        gameId: `${config.slug}-session-duplicate`,
        topic: config.topic
      }
    });
  }

  if (config.upgradeAttempts > 0) {
    usage.push({
      eventType: 'billing.checkout.started',
      totalValue: config.upgradeAttempts,
      eventTime: isoAtOffset(now, config.dayOffset, 25),
      metadata: {
        source: 'pilot-bootstrap',
        userEmail: config.ownerEmail
      }
    });
  }

  if (config.paidActivations > 0) {
    usage.push({
      eventType: 'billing.subscription.activated',
      totalValue: config.paidActivations,
      eventTime: isoAtOffset(now, config.dayOffset, 30),
      metadata: {
        planCode: 'pro-host-monthly'
      }
    });
  }

  return {
    slug: config.slug,
    name: `Pilot Recurring Host ${config.label}`,
    billingEmail: `billing+${config.slug}@smartiq.test`,
    member: {
      email: config.ownerEmail,
      displayName: `Pilot Host ${config.label}`,
      role: 'owner'
    },
    targetUsageTotals: usage,
    supportCases: config.supportCases || []
  };
}

function buildSeedPlan(now) {
  return [
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-acme',
      label: 'Acme',
      ownerEmail: 'owner+pilot-acme@smartiq.test',
      dayOffset: -10,
      sessionLaunches: 0,
      completedSessions: 0,
      topic: 'Onboarding Night',
      supportCases: [
        {
          title: 'Host stalled before first live launch',
          category: 'onboarding',
          priority: 'high',
          owner: 'Founder',
          summary: 'Host signed in but did not progress to room launch.',
          nextStep: 'Review setup copy and provide founder follow-up.',
          status: 'open',
          resolution: ''
        }
      ]
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-birch',
      label: 'Birch',
      ownerEmail: 'owner+pilot-birch@smartiq.test',
      dayOffset: -9,
      sessionLaunches: 2,
      completedSessions: 2,
      topic: 'Demo Night',
      supportCases: [
        {
          title: 'Join screen copy confusion',
          category: 'onboarding',
          priority: 'medium',
          owner: 'Founder',
          summary: 'Players initially missed the room code hint.',
          nextStep: 'Keep monitoring after copy adjustment.',
          status: 'resolved',
          resolution: 'Updated join route copy and confirmed next run completed.'
        }
      ]
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-cinder',
      label: 'Cinder',
      ownerEmail: 'owner+pilot-cinder@smartiq.test',
      dayOffset: -8,
      sessionLaunches: 1,
      completedSessions: 0,
      resumeActions: 1,
      topic: 'Launch Rehearsal'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-delta',
      label: 'Delta',
      ownerEmail: 'owner+pilot-delta@smartiq.test',
      dayOffset: -7,
      sessionLaunches: 2,
      completedSessions: 2,
      topic: 'Community Quiz'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-ember',
      label: 'Ember',
      ownerEmail: 'owner+pilot-ember@smartiq.test',
      dayOffset: -6,
      sessionLaunches: 3,
      completedSessions: 2,
      duplicateLaunches: 1,
      topic: 'Office Trivia'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-fjord',
      label: 'Fjord',
      ownerEmail: 'owner+pilot-fjord@smartiq.test',
      dayOffset: -5,
      sessionLaunches: 2,
      completedSessions: 1,
      resumeActions: 1,
      topic: 'Friday Social'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-grove',
      label: 'Grove',
      ownerEmail: 'owner+pilot-grove@smartiq.test',
      dayOffset: -4,
      sessionLaunches: 1,
      completedSessions: 0,
      topic: 'Team Warmup'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-harbor',
      label: 'Harbor',
      ownerEmail: 'owner+pilot-harbor@smartiq.test',
      dayOffset: -3,
      sessionLaunches: 1,
      completedSessions: 0,
      upgradeAttempts: 1,
      topic: 'Workshop Quiz'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-ivory',
      label: 'Ivory',
      ownerEmail: 'owner+pilot-ivory@smartiq.test',
      dayOffset: -2,
      sessionLaunches: 1,
      completedSessions: 0,
      topic: 'Campus Night'
    }),
    buildTenantPlan(now, {
      slug: 'pilot-recurring-host-jade',
      label: 'Jade',
      ownerEmail: 'owner+pilot-jade@smartiq.test',
      dayOffset: -1,
      sessionLaunches: 1,
      completedSessions: 0,
      upgradeAttempts: 1,
      paidActivations: 1,
      topic: 'Pilot Upgrade Trial',
      supportCases: [
        {
          title: 'Upgrade confirmation needed',
          category: 'billing',
          priority: 'medium',
          owner: 'Founder',
          summary: 'Host wanted confirmation that paid unlock applied immediately.',
          nextStep: 'Verify same-session entitlement refresh.',
          status: 'resolved',
          resolution: 'Confirmed upgrade return refresh and shared verification back to host.'
        }
      ]
    })
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

async function listSupportCases(baseUrl, internalApiKey, tenantId) {
  const payload = await requestJson(baseUrl, internalApiKey, 'GET', `/internal/wl/tenants/${tenantId}/support-cases`);
  return Array.isArray(payload) ? payload : [];
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

async function ensureSupportCases(baseUrl, internalApiKey, tenantId, tenantPlan, apply) {
  if (!tenantPlan.supportCases || tenantPlan.supportCases.length === 0) {
    return;
  }

  const existingCases = await listSupportCases(baseUrl, internalApiKey, tenantId);

  for (const targetCase of tenantPlan.supportCases) {
    let existing = existingCases.find((item) => item.title === targetCase.title);
    if (!existing) {
      if (!apply) {
        console.log(`[dry-run] would create support case tenant=${tenantPlan.slug} title=${targetCase.title} status=${targetCase.status}`);
        continue;
      }
      existing = await requestJson(baseUrl, internalApiKey, 'POST', `/internal/wl/tenants/${tenantId}/support-cases`, {
        title: targetCase.title,
        category: targetCase.category,
        priority: targetCase.priority,
        owner: targetCase.owner,
        summary: targetCase.summary,
        nextStep: targetCase.nextStep
      });
      existingCases.push(existing);
      console.log(`[seed] created support case tenant=${tenantPlan.slug} title=${targetCase.title}`);
    }

    if (existing.status === targetCase.status) {
      console.log(`[seed] support case already sufficient tenant=${tenantPlan.slug} title=${targetCase.title} status=${existing.status}`);
      continue;
    }

    if (!apply) {
      console.log(`[dry-run] would update support case tenant=${tenantPlan.slug} title=${targetCase.title} status=${targetCase.status}`);
      continue;
    }

    await requestJson(baseUrl, internalApiKey, 'PATCH', `/internal/wl/tenants/${tenantId}/support-cases/${existing.caseId}`, {
      status: targetCase.status,
      owner: targetCase.owner,
      summary: targetCase.summary,
      nextStep: targetCase.nextStep,
      resolution: targetCase.resolution || ''
    });
    console.log(`[seed] updated support case tenant=${tenantPlan.slug} title=${targetCase.title} status=${targetCase.status}`);
  }
}

async function printVerification(baseUrl, internalApiKey, seedPlan, apply) {
  if (!apply) {
    console.log('[dry-run] expected seeded aggregate after apply: totalTenants>=10 activeTenants>=10 activatedHosts>=10 repeatHosts>=5 paidConversions>=1');
    return;
  }

  let activatedHosts = 0;
  let repeatHosts = 0;
  let paidConversions = 0;
  let openSupportCases = 0;
  let resolvedSupportCases = 0;

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
    openSupportCases += summary.openSupportCases || 0;
    resolvedSupportCases += summary.resolvedSupportCases || 0;
    console.log(`[verify] tenant=${tenantPlan.slug} activated=${summary.activated} repeatHost=${summary.repeatHost} paidConverted=${summary.paidConverted} openSupportCases=${summary.openSupportCases} resolvedSupportCases=${summary.resolvedSupportCases}`);
  }

  console.log(`[verify] seeded aggregate totalTenants=${seedPlan.length} activeTenants=${seedPlan.length} activatedHosts=${activatedHosts} repeatHosts=${repeatHosts} paidConversions=${paidConversions} openSupportCases=${openSupportCases} resolvedSupportCases=${resolvedSupportCases}`);
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
      await ensureSupportCases(backendUrl, internalApiKey, tenantId, tenantPlan, apply);
    } else {
      console.log(`[dry-run] would verify owner, usage, and support cases for tenant=${tenantPlan.slug}`);
    }
  }

  await printVerification(backendUrl, internalApiKey, seedPlan, apply);
  console.log(apply ? '[seed] recurring-host pilot bootstrap completed' : '[dry-run] no live changes were made');
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
