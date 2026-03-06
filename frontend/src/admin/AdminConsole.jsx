import { useEffect, useMemo, useState } from 'react';
import {
  getSettings,
  getSubscription,
  getTenant,
  listAuditEvents,
  listMembers,
  listTenants,
  listUsageEvents,
  listUsageSummary,
  removeMember,
  resolveAdminError,
  toBrandingPayload,
  toSubscriptionPayload,
  updateMember,
  updateSettings,
  updateTenantBranding,
  updateSubscription
} from './api';

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

  async function loadTenantData(tenantId) {
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
      const tenantAudit = await listAuditEvents(tenantId, {
        limit: auditLimit
      });

      setTenantDetail(detail);
      setMembers(Array.isArray(tenantMembers) ? tenantMembers : []);
      setSettings(tenantSettings);
      setSubscription(tenantSubscription);
      setUsageEvents(Array.isArray(tenantUsage) ? tenantUsage : []);
      setUsageSummary(Array.isArray(tenantUsageSummary) ? tenantUsageSummary : []);
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
    } catch (error) {
      const resolved = resolveAdminError(error);
      setGlobalError(`${resolved.title}: ${resolved.detail}`);
    } finally {
      setLoadingTenantData(false);
    }
  }

  useEffect(() => {
    loadTenants();
  }, []);

  useEffect(() => {
    if (!selectedTenantId) {
      return;
    }
    loadTenantData(selectedTenantId);
  }, [selectedTenantId]);

  const selectedTenant = useMemo(
    () => tenants.find((tenant) => tenant.tenantId === selectedTenantId) || null,
    [tenants, selectedTenantId]
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
      const nextAudit = await listAuditEvents(selectedTenantId, {
        limit: auditLimit
      });
      setUsageEvents(Array.isArray(nextUsage) ? nextUsage : []);
      setUsageSummary(Array.isArray(nextUsageSummary) ? nextUsageSummary : []);
      setAuditEvents(Array.isArray(nextAudit) ? nextAudit : []);
      setUsageFeedback('Usage and audit refreshed.');
    } catch (error) {
      const resolved = resolveAdminError(error);
      setUsageFeedback(`${resolved.title}: ${resolved.detail}`);
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
                <form className="wl-admin-form" onSubmit={handleBrandingSubmit}>
                  <label htmlFor="branding-app-name">App name</label>
                  <input
                    id="branding-app-name"
                    value={brandingForm.appName}
                    onChange={(event) => setBrandingForm((current) => ({ ...current, appName: event.target.value }))}
                  />

                  <label htmlFor="branding-logo-url">Logo URL</label>
                  <input
                    id="branding-logo-url"
                    value={brandingForm.logoUrl}
                    onChange={(event) => setBrandingForm((current) => ({ ...current, logoUrl: event.target.value }))}
                  />

                  <div className="wl-admin-grid-two">
                    <div>
                      <label htmlFor="branding-primary-color">Primary color</label>
                      <input
                        id="branding-primary-color"
                        value={brandingForm.primaryColor}
                        onChange={(event) => setBrandingForm((current) => ({ ...current, primaryColor: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="branding-secondary-color">Secondary color</label>
                      <input
                        id="branding-secondary-color"
                        value={brandingForm.secondaryColor}
                        onChange={(event) => setBrandingForm((current) => ({ ...current, secondaryColor: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="wl-admin-actions">
                    <button type="submit">Save branding</button>
                  </div>
                  {brandingFeedback ? <p data-testid="branding-feedback">{brandingFeedback}</p> : null}
                </form>
              ) : null}

              {activeTab === 'Members' ? (
                <section className="wl-admin-block">
                  <table>
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((member) => (
                        <tr key={member.membershipId}>
                          <td>{member.email}</td>
                          <td>
                            <select
                              aria-label={`Role for ${member.email}`}
                              value={memberDrafts[member.membershipId]?.role || member.role}
                              onChange={(event) => handleMemberDraftChange(member.membershipId, 'role', event.target.value)}
                            >
                              <option value="OWNER">OWNER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="MEMBER">MEMBER</option>
                            </select>
                          </td>
                          <td>
                            <select
                              aria-label={`Status for ${member.email}`}
                              value={memberDrafts[member.membershipId]?.status || member.status}
                              onChange={(event) => handleMemberDraftChange(member.membershipId, 'status', event.target.value)}
                            >
                              <option value="ACTIVE">ACTIVE</option>
                              <option value="INVITED">INVITED</option>
                              <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                          </td>
                          <td>
                            <div className="wl-admin-row-actions">
                              <button type="button" onClick={() => handleMemberSave(member.membershipId)}>
                                Save
                              </button>
                              <button type="button" onClick={() => handleMemberRemove(member.membershipId)}>
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {memberFeedback ? <p data-testid="members-feedback">{memberFeedback}</p> : null}
                </section>
              ) : null}

              {activeTab === 'Settings' ? (
                <form className="wl-admin-form" onSubmit={handleSettingsSubmit}>
                  <label htmlFor="tenant-settings-json">Settings JSON</label>
                  <textarea
                    id="tenant-settings-json"
                    rows={10}
                    value={settingsJson}
                    onChange={(event) => setSettingsJson(event.target.value)}
                  />
                  <div className="wl-admin-actions">
                    <button type="submit">Save settings</button>
                  </div>
                  {settingsFeedback ? <p data-testid="settings-feedback">{settingsFeedback}</p> : null}
                </form>
              ) : null}

              {activeTab === 'Subscription' ? (
                <form className="wl-admin-form" onSubmit={handleSubscriptionSubmit}>
                  <div className="wl-admin-grid-two">
                    <div>
                      <label htmlFor="subscription-plan-code">Plan code</label>
                      <input
                        id="subscription-plan-code"
                        value={subscriptionForm.planCode}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, planCode: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="subscription-status">Status</label>
                      <input
                        id="subscription-status"
                        value={subscriptionForm.status}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, status: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="subscription-billing-cycle">Billing cycle</label>
                      <input
                        id="subscription-billing-cycle"
                        value={subscriptionForm.billingCycle}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, billingCycle: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="subscription-trial-ends">Trial ends at</label>
                      <input
                        id="subscription-trial-ends"
                        type="datetime-local"
                        value={subscriptionForm.trialEndsAt}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, trialEndsAt: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="subscription-period-start">Period starts at</label>
                      <input
                        id="subscription-period-start"
                        type="datetime-local"
                        value={subscriptionForm.currentPeriodStartsAt}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, currentPeriodStartsAt: event.target.value }))}
                      />
                    </div>
                    <div>
                      <label htmlFor="subscription-period-end">Period ends at</label>
                      <input
                        id="subscription-period-end"
                        type="datetime-local"
                        value={subscriptionForm.currentPeriodEndsAt}
                        onChange={(event) => setSubscriptionForm((current) => ({ ...current, currentPeriodEndsAt: event.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="wl-admin-actions">
                    <button type="submit">Save subscription</button>
                  </div>
                  {subscriptionFeedback ? <p data-testid="subscription-feedback">{subscriptionFeedback}</p> : null}
                </form>
              ) : null}

              {activeTab === 'Usage & Audit' ? (
                <section className="wl-admin-block">
                  <h3>Pilot metrics</h3>
                  <div className="wl-admin-pilot-metrics" data-testid="pilot-metrics">
                    {PILOT_METRIC_LABELS.map((metric) => {
                      const row = Array.isArray(usageSummary)
                        ? usageSummary.find((entry) => entry.eventType === metric.eventType)
                        : null;
                      return (
                        <article key={metric.eventType} className="wl-admin-pilot-metric-card">
                          <strong>{row?.totalValue ?? 0}</strong>
                          <span>{metric.label}</span>
                          <small>{metric.eventType}</small>
                        </article>
                      );
                    })}
                  </div>

                  <div className="wl-admin-grid-two wl-admin-usage-controls">
                    <div>
                      <label htmlFor="usage-event-type">Usage event type</label>
                      <input
                        id="usage-event-type"
                        placeholder="example: API_CALL"
                        value={eventTypeFilter}
                        onChange={(event) => setEventTypeFilter(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="usage-limit">Usage limit</label>
                      <input
                        id="usage-limit"
                        type="number"
                        min="1"
                        max="200"
                        value={usageLimit}
                        onChange={(event) => setUsageLimit(event.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="audit-limit">Audit limit</label>
                      <input
                        id="audit-limit"
                        type="number"
                        min="1"
                        max="200"
                        value={auditLimit}
                        onChange={(event) => setAuditLimit(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="wl-admin-actions">
                    <button type="button" onClick={handleUsageRefresh}>Refresh usage and audit</button>
                  </div>

                  <h3>Usage events</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Value</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageEvents.map((event) => (
                        <tr key={event.usageEventId}>
                          <td>{event.eventType}</td>
                          <td>{event.eventValue}</td>
                          <td>{formatTime(event.eventTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h3>Audit events</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Action</th>
                        <th>Entity</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map((event) => (
                        <tr key={event.auditEventId}>
                          <td>{event.action}</td>
                          <td>{event.entityType}:{event.entityId}</td>
                          <td>{formatTime(event.eventTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {usageFeedback ? <p data-testid="usage-feedback">{usageFeedback}</p> : null}
                </section>
              ) : null}
            </>
          ) : null}
        </section>
      </section>
    </main>
  );
}
