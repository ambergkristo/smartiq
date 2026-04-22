import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createSupportCase,
  getSettings,
  getPilotSummary,
  getSubscription,
  getTenant,
  listAuditEvents,
  listMembers,
  listSupportCases,
  listTenants,
  listUsageEvents,
  listUsageSummary,
  removeMember,
  resolveAdminError,
  toBrandingPayload,
  toSubscriptionPayload,
  updateSupportCase,
  updateMember,
  updateSettings,
  updateTenantBranding,
  updateSubscription
} from './api';
import {
  BrandingPanel,
  MembersPanel,
  SettingsPanel,
  SubscriptionPanel,
  UsageAuditPanel
} from './AdminConsolePanels';

const TABS = ['Branding', 'Members', 'Settings', 'Subscription', 'Usage & Audit'];

const PILOT_METRIC_LABELS = [
  { eventType: 'host.workspace.bootstrapped', label: 'Bootstraps' },
  { eventType: 'host.auth.completed', label: 'Host sign-ins' },
  { eventType: 'host.session.started', label: 'Session launches' },
  { eventType: 'host.session.duplicated', label: 'Duplicate relaunches' },
  { eventType: 'host.session.resumed', label: 'Resume actions' },
  { eventType: 'host.session.completed', label: 'Completed sessions' },
  { eventType: 'billing.checkout.started', label: 'Upgrade attempts' },
  { eventType: 'billing.subscription.activated', label: 'Paid activations' }
];

const SUPPORT_CASE_CATEGORY_OPTIONS = ['onboarding', 'live_run', 'billing', 'retention', 'general'];
const SUPPORT_CASE_PRIORITY_OPTIONS = ['high', 'medium', 'low'];

function toPrettyJson(value) {
  if (value === null || value === undefined) {
    return '{}';
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '{}';
  }
}

function toLocalDateTime(value) {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString().slice(0, 16);
}

function toIsoOrNull(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function formatTime(value) {
  if (!value) {
    return '-';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }
  return parsed.toLocaleString();
}

function formatSupportLabel(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || '-';
}

function formatPilotRisk(value) {
  return String(value || '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ') || 'Tracking';
}

function getUsageMetricTotal(usageSummary, eventType) {
  if (!Array.isArray(usageSummary)) {
    return 0;
  }
  const row = usageSummary.find((entry) => entry.eventType === eventType);
  const totalValue = Number(row?.totalValue ?? 0);
  return Number.isFinite(totalValue) ? totalValue : 0;
}

function buildSellableReadiness(pilotSummary, usageSummary) {
  const activated = Boolean(pilotSummary?.activated);
  const repeatHost = Boolean(pilotSummary?.repeatHost);
  const paidConverted = Boolean(pilotSummary?.paidConverted);
  const openSupportCases = Number(pilotSummary?.openSupportCases ?? 0);
  const launches = getUsageMetricTotal(usageSummary, 'host.session.started');
  const completedSessions = getUsageMetricTotal(usageSummary, 'host.session.completed');
  const upgradeAttempts = getUsageMetricTotal(usageSummary, 'billing.checkout.started');
  const paidActivations = getUsageMetricTotal(usageSummary, 'billing.subscription.activated');

  let signal = 'No validated signal';
  if (activated) {
    signal = 'Activation signal';
  }
  if (repeatHost) {
    signal = 'Repeat-host signal';
  }
  if (paidConverted) {
    signal = repeatHost ? 'Repeatable paid signal' : 'First paid signal';
  }

  const proofGaps = [];
  if (!activated) {
    proofGaps.push('Need first live host activation on the canonical workflow.');
  }
  if (activated && !repeatHost) {
    proofGaps.push('Need repeat hosting behavior from the same segment.');
  }
  if (repeatHost && !paidConverted) {
    proofGaps.push('Need canonical paid conversion from a repeat host.');
  }
  if (openSupportCases > 0) {
    proofGaps.push(`Reduce open support friction in ${formatSupportLabel(pilotSummary?.topOpenSupportCategory).toLowerCase()}.`);
  }

  return {
    signal,
    launches,
    completedSessions,
    upgradeAttempts,
    paidActivations,
    proofGaps,
    nextAction: proofGaps[0] || 'Pressure-test broader sell motion while monitoring support load.'
  };
}

function buildMemberDrafts(members) {
  const drafts = {};
  members.forEach((member) => {
    drafts[member.membershipId] = {
      role: member.role || 'MEMBER',
      status: member.status || 'ACTIVE'
    };
  });
  return drafts;
}

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState('Branding');
  const [tenants, setTenants] = useState([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [tenantDetail, setTenantDetail] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usageEvents, setUsageEvents] = useState([]);
  const [usageSummary, setUsageSummary] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [pilotSummary, setPilotSummary] = useState(null);
  const [supportCases, setSupportCases] = useState([]);

  const [loadingTenants, setLoadingTenants] = useState(true);
  const [loadingTenantData, setLoadingTenantData] = useState(false);

  const [globalError, setGlobalError] = useState('');

  const [brandingForm, setBrandingForm] = useState({
    appName: '',
    logoUrl: '',
    primaryColor: '',
    secondaryColor: ''
  });
  const [brandingFeedback, setBrandingFeedback] = useState('');

  const [memberDrafts, setMemberDrafts] = useState({});
  const [memberFeedback, setMemberFeedback] = useState('');

  const [settingsJson, setSettingsJson] = useState('{}');
  const [settingsFeedback, setSettingsFeedback] = useState('');

  const [subscriptionForm, setSubscriptionForm] = useState({
    planCode: '',
    status: '',
    billingCycle: '',
    trialEndsAt: '',
    currentPeriodStartsAt: '',
    currentPeriodEndsAt: ''
  });
  const [subscriptionFeedback, setSubscriptionFeedback] = useState('');

  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [usageLimit, setUsageLimit] = useState('20');
  const [auditLimit, setAuditLimit] = useState('20');
  const [usageFeedback, setUsageFeedback] = useState('');
  const [supportCaseForm, setSupportCaseForm] = useState({
    title: '',
    category: 'onboarding',
    priority: 'high',
    owner: '',
    summary: '',
    nextStep: ''
  });
  const [supportFeedback, setSupportFeedback] = useState('');

  async function loadTenants() {
    setLoadingTenants(true);
    setGlobalError('');
    try {
      const items = await listTenants();
      setTenants(Array.isArray(items) ? items : []);
      if (Array.isArray(items) && items.length > 0) {
        setSelectedTenantId((current) => current || items[0].tenantId);
      } else {
        setSelectedTenantId('');
      }
    } catch (error) {
      const resolved = resolveAdminError(error);
      setGlobalError(`${resolved.title}: ${resolved.detail}`);
    } finally {
      setLoadingTenants(false);
    }
  }

  const loadTenantData = useCallback(async (tenantId) => {
    if (!tenantId) {
      return;
    }

    setLoadingTenantData(true);
    setGlobalError('');

    try {
      const detail = await getTenant(tenantId);
      const tenantMembers = await listMembers(tenantId);
      const tenantSettings = await getSettings(tenantId);
      const tenantSubscription = await getSubscription(tenantId);
      const tenantUsage = await listUsageEvents(tenantId, {
        eventType: eventTypeFilter,
        limit: usageLimit
      });
      const tenantUsageSummary = await listUsageSummary(tenantId);
      const tenantPilotSummary = await getPilotSummary(tenantId);
      const tenantSupportCases = await listSupportCases(tenantId);
      const tenantAudit = await listAuditEvents(tenantId, {
        limit: auditLimit
      });

      setTenantDetail(detail);
      setMembers(Array.isArray(tenantMembers) ? tenantMembers : []);
      setSettings(tenantSettings);
      setSubscription(tenantSubscription);
      setUsageEvents(Array.isArray(tenantUsage) ? tenantUsage : []);
      setUsageSummary(Array.isArray(tenantUsageSummary) ? tenantUsageSummary : []);
      setPilotSummary(tenantPilotSummary || null);
      setSupportCases(Array.isArray(tenantSupportCases) ? tenantSupportCases : []);
      setAuditEvents(Array.isArray(tenantAudit) ? tenantAudit : []);

      const branding = detail?.branding || {};
      setBrandingForm({
        appName: branding.appName || '',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '',
        secondaryColor: branding.secondaryColor || ''
      });
      setMemberDrafts(buildMemberDrafts(Array.isArray(tenantMembers) ? tenantMembers : []));
      setSettingsJson(toPrettyJson(tenantSettings?.settings));
      setSubscriptionForm({
        planCode: tenantSubscription?.planCode || '',
        status: tenantSubscription?.status || '',
        billingCycle: tenantSubscription?.billingCycle || '',
        trialEndsAt: toLocalDateTime(tenantSubscription?.trialEndsAt),
        currentPeriodStartsAt: toLocalDateTime(tenantSubscription?.currentPeriodStartsAt),
        currentPeriodEndsAt: toLocalDateTime(tenantSubscription?.currentPeriodEndsAt)
      });

      setBrandingFeedback('');
      setMemberFeedback('');
      setSettingsFeedback('');
      setSubscriptionFeedback('');
      setUsageFeedback('');
      setSupportCaseForm({
        title: '',
        category: 'onboarding',
        priority: 'high',
        owner: '',
        summary: '',
        nextStep: ''
      });
      setSupportFeedback('');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setGlobalError(`${resolved.title}: ${resolved.detail}`);
    } finally {
      setLoadingTenantData(false);
    }
  }, [auditLimit, eventTypeFilter, usageLimit]);

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      return;
    }
    loadTenantData(selectedTenantId);
  }, [loadTenantData, selectedTenantId]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) || null,
    [tenants, selectedTenantId]
  );
  const sellableReadiness = useMemo(
    () => buildSellableReadiness(pilotSummary, usageSummary),
    [pilotSummary, usageSummary]
  );

  async function handleBrandingSubmit(event) {
    event.preventDefault();
    if (!selectedTenantId) {
      return;
    }

    if (!String(brandingForm.appName || '').trim()) {
      setBrandingFeedback('Validation: app name is required.');
      return;
    }

    try {
      const updated = await updateTenantBranding(selectedTenantId, toBrandingPayload(brandingForm));
      setTenantDetail(updated);
      const branding = updated?.branding || {};
      setBrandingForm({
        appName: branding.appName || '',
        logoUrl: branding.logoUrl || '',
        primaryColor: branding.primaryColor || '',
        secondaryColor: branding.secondaryColor || ''
      });
      setBrandingFeedback('Branding saved.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setBrandingFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  function handleMemberDraftChange(membershipId, key, value) {
    setMemberDrafts((current) => ({
      ...current,
      [membershipId]: {
        ...current[membershipId],
        [key]: value
      }
    }));
  }

  async function handleMemberSave(membershipId) {
    if (!selectedTenantId) {
      return;
    }

    const draft = memberDrafts[membershipId] || {};
    try {
      const updated = await updateMember(selectedTenantId, membershipId, {
        role: draft.role,
        status: draft.status
      });
      setMembers((current) => current.map((member) => (
        member.membershipId === updated.membershipId ? updated : member
      )));
      setMemberFeedback('Member saved.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setMemberFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleMemberRemove(membershipId) {
    if (!selectedTenantId) {
      return;
    }

    try {
      await removeMember(selectedTenantId, membershipId);
      const next = members.filter((member) => member.membershipId !== membershipId);
      setMembers(next);
      setMemberDrafts(buildMemberDrafts(next));
      setMemberFeedback('Member removed.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setMemberFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleSettingsSubmit(event) {
    event.preventDefault();
    if (!selectedTenantId) {
      return;
    }

    let parsedSettings;
    try {
      parsedSettings = JSON.parse(settingsJson || '{}');
    } catch {
      setSettingsFeedback('Validation: settings JSON must be valid.');
      return;
    }

    try {
      const updated = await updateSettings(selectedTenantId, {
        settings: parsedSettings
      });
      setSettings(updated);
      setSettingsJson(toPrettyJson(updated?.settings));
      setSettingsFeedback('Settings saved.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setSettingsFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleSubscriptionSubmit(event) {
    event.preventDefault();
    if (!selectedTenantId) {
      return;
    }

    if (!String(subscriptionForm.planCode || '').trim()) {
      setSubscriptionFeedback('Validation: plan code is required.');
      return;
    }

    const payload = toSubscriptionPayload({
      ...subscriptionForm,
      trialEndsAt: toIsoOrNull(subscriptionForm.trialEndsAt),
      currentPeriodStartsAt: toIsoOrNull(subscriptionForm.currentPeriodStartsAt),
      currentPeriodEndsAt: toIsoOrNull(subscriptionForm.currentPeriodEndsAt)
    });

    try {
      const updated = await updateSubscription(selectedTenantId, payload);
      setSubscription(updated);
      setSubscriptionForm({
        planCode: updated?.planCode || '',
        status: updated?.status || '',
        billingCycle: updated?.billingCycle || '',
        trialEndsAt: toLocalDateTime(updated?.trialEndsAt),
        currentPeriodStartsAt: toLocalDateTime(updated?.currentPeriodStartsAt),
        currentPeriodEndsAt: toLocalDateTime(updated?.currentPeriodEndsAt)
      });
      setSubscriptionFeedback('Subscription saved.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setSubscriptionFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleUsageRefresh() {
    if (!selectedTenantId) {
      return;
    }

    try {
      const nextUsage = await listUsageEvents(selectedTenantId, {
        eventType: eventTypeFilter,
        limit: usageLimit
      });
      const nextUsageSummary = await listUsageSummary(selectedTenantId);
      const nextPilotSummary = await getPilotSummary(selectedTenantId);
      const nextSupportCases = await listSupportCases(selectedTenantId);
      const nextAudit = await listAuditEvents(selectedTenantId, {
        limit: auditLimit
      });
      setUsageEvents(Array.isArray(nextUsage) ? nextUsage : []);
      setUsageSummary(Array.isArray(nextUsageSummary) ? nextUsageSummary : []);
      setPilotSummary(nextPilotSummary || null);
      setSupportCases(Array.isArray(nextSupportCases) ? nextSupportCases : []);
      setAuditEvents(Array.isArray(nextAudit) ? nextAudit : []);
      setUsageFeedback('Usage and audit refreshed.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setUsageFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleSupportCaseSubmit(event) {
    event.preventDefault();
    if (!selectedTenantId) {
      return;
    }

    if (!String(supportCaseForm.title || '').trim() || !String(supportCaseForm.owner || '').trim() || !String(supportCaseForm.summary || '').trim()) {
      setSupportFeedback('Validation: title, owner, and summary are required.');
      return;
    }

    try {
      const created = await createSupportCase(selectedTenantId, supportCaseForm);
      setSupportCases((current) => [created, ...current]);
      setSupportCaseForm({
        title: '',
        category: 'onboarding',
        priority: 'high',
        owner: '',
        summary: '',
        nextStep: ''
      });
      const nextPilotSummary = await getPilotSummary(selectedTenantId);
      setPilotSummary(nextPilotSummary || null);
      setSupportFeedback('Support case logged.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setSupportFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  async function handleSupportStatusToggle(caseItem) {
    if (!selectedTenantId || !caseItem?.caseId) {
      return;
    }

    const nextStatus = caseItem.status === 'resolved' ? 'open' : 'resolved';
    try {
      const updated = await updateSupportCase(selectedTenantId, caseItem.caseId, {
        status: nextStatus,
        resolution: nextStatus === 'resolved' ? 'Resolved in admin pilot support loop.' : null
      });
      setSupportCases((current) => current.map((item) => (
        item.caseId === updated.caseId ? updated : item
      )));
      const nextPilotSummary = await getPilotSummary(selectedTenantId);
      setPilotSummary(nextPilotSummary || null);
      setSupportFeedback(nextStatus === 'resolved' ? 'Support case resolved.' : 'Support case reopened.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setSupportFeedback(`${resolved.title}: ${resolved.detail}`);
    }
  }

  return (
    <main className="wl-admin-root" data-testid="wl-admin-console">
      <header className="wl-admin-header board-surface">
        <h1>SmartIQ White-Label Admin</h1>
        <p>Tenant operations against <code>/internal/wl/*</code> contracts.</p>
      </header>

      <section className="wl-admin-shell">
        <aside className="wl-admin-tenants board-surface" aria-label="Tenant list">
          <div className="wl-admin-tenants-head">
            <h2>Tenants</h2>
            <button type="button" onClick={loadTenants} disabled={loadingTenants}>
              Refresh
            </button>
          </div>
          {loadingTenants ? <p>Loading tenants...</p> : null}
          {!loadingTenants && tenants.length === 0 ? <p>No tenants found.</p> : null}
          <ul>
            {tenants.map((tenant) => (
              <li key={tenant.tenantId}>
                <button
                  type="button"
                  className={tenant.tenantId === selectedTenantId ? 'selected' : ''}
                  onClick={() => setSelectedTenantId(tenant.tenantId)}
                >
                  <span>{tenant.name}</span>
                  <small>{tenant.status}</small>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="wl-admin-detail board-surface" aria-label="Tenant detail">
          {globalError ? (
            <div className="error-panel" data-testid="admin-global-error">
              <p className="error">{globalError}</p>
            </div>
          ) : null}

          {!selectedTenant ? <p>Select tenant to continue.</p> : null}

          {selectedTenant ? (
            <>
              <div className="wl-admin-detail-head">
                <div>
                  <h2>{selectedTenant.name}</h2>
                  <p>
                    {selectedTenant.slug} | {selectedTenant.status}
                  </p>
                </div>
                {loadingTenantData ? <p>Refreshing tenant data...</p> : null}
              </div>

              <nav className="wl-admin-tabs" aria-label="Admin tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={tab === activeTab ? 'selected' : ''}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              {activeTab === 'Branding' ? (
                <BrandingPanel
                  brandingForm={brandingForm}
                  setBrandingForm={setBrandingForm}
                  brandingFeedback={brandingFeedback}
                  onSubmit={handleBrandingSubmit}
                />
              ) : null}

              {activeTab === 'Members' ? (
                <MembersPanel
                  members={members}
                  memberDrafts={memberDrafts}
                  memberFeedback={memberFeedback}
                  onMemberDraftChange={handleMemberDraftChange}
                  onMemberRemove={handleMemberRemove}
                  onMemberSave={handleMemberSave}
                />
              ) : null}

              {activeTab === 'Settings' ? (
                <SettingsPanel
                  settingsJson={settingsJson}
                  settingsFeedback={settingsFeedback}
                  setSettingsJson={setSettingsJson}
                  onSubmit={handleSettingsSubmit}
                />
              ) : null}

              {activeTab === 'Subscription' ? (
                <SubscriptionPanel
                  subscriptionForm={subscriptionForm}
                  subscriptionFeedback={subscriptionFeedback}
                  setSubscriptionForm={setSubscriptionForm}
                  onSubmit={handleSubscriptionSubmit}
                />
              ) : null}

              {activeTab === 'Usage & Audit' ? (
                <UsageAuditPanel
                  pilotSummary={pilotSummary}
                  sellableReadiness={sellableReadiness}
                  usageSummary={usageSummary}
                  eventTypeFilter={eventTypeFilter}
                  usageLimit={usageLimit}
                  auditLimit={auditLimit}
                  setEventTypeFilter={setEventTypeFilter}
                  setUsageLimit={setUsageLimit}
                  setAuditLimit={setAuditLimit}
                  handleUsageRefresh={handleUsageRefresh}
                  supportCaseForm={supportCaseForm}
                  setSupportCaseForm={setSupportCaseForm}
                  handleSupportCaseSubmit={handleSupportCaseSubmit}
                  supportFeedback={supportFeedback}
                  supportCases={supportCases}
                  handleSupportStatusToggle={handleSupportStatusToggle}
                  usageEvents={usageEvents}
                  auditEvents={auditEvents}
                  usageFeedback={usageFeedback}
                  formatPilotRisk={formatPilotRisk}
                  formatSupportLabel={formatSupportLabel}
                  formatTime={formatTime}
                  pilotMetricLabels={PILOT_METRIC_LABELS}
                  supportCaseCategoryOptions={SUPPORT_CASE_CATEGORY_OPTIONS}
                  supportCasePriorityOptions={SUPPORT_CASE_PRIORITY_OPTIONS}
                />
              ) : null}
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
