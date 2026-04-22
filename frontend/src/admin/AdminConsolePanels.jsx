export function BrandingPanel({ brandingForm, setBrandingForm, brandingFeedback, onSubmit }) {
  return (
    <form className="wl-admin-form" onSubmit={onSubmit}>
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
  );
}

export function MembersPanel({
  members,
  memberDrafts,
  memberFeedback,
  onMemberDraftChange,
  onMemberRemove,
  onMemberSave
}) {
  return (
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
                  onChange={(event) => onMemberDraftChange(member.membershipId, 'role', event.target.value)}
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
                  onChange={(event) => onMemberDraftChange(member.membershipId, 'status', event.target.value)}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INVITED">INVITED</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </td>
              <td>
                <div className="wl-admin-row-actions">
                  <button type="button" onClick={() => onMemberSave(member.membershipId)}>
                    Save
                  </button>
                  <button type="button" onClick={() => onMemberRemove(member.membershipId)}>
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
  );
}

export function SettingsPanel({ settingsJson, settingsFeedback, setSettingsJson, onSubmit }) {
  return (
    <form className="wl-admin-form" onSubmit={onSubmit}>
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
  );
}

export function SubscriptionPanel({ subscriptionForm, subscriptionFeedback, setSubscriptionForm, onSubmit }) {
  return (
    <form className="wl-admin-form" onSubmit={onSubmit}>
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
  );
}

export function UsageAuditPanel({
  pilotSummary,
  sellableReadiness,
  usageSummary,
  eventTypeFilter,
  usageLimit,
  auditLimit,
  setEventTypeFilter,
  setUsageLimit,
  setAuditLimit,
  handleUsageRefresh,
  supportCaseForm,
  setSupportCaseForm,
  handleSupportCaseSubmit,
  supportFeedback,
  supportCases,
  handleSupportStatusToggle,
  usageEvents,
  auditEvents,
  usageFeedback,
  formatPilotRisk,
  formatSupportLabel,
  formatTime,
  pilotMetricLabels,
  supportCaseCategoryOptions,
  supportCasePriorityOptions
}) {
  return (
    <section className="wl-admin-block">
      <h3>Pilot summary</h3>
      <section className="wl-admin-pilot-summary" data-testid="pilot-summary">
        <article className="wl-admin-pilot-summary-card">
          <span>Risk</span>
          <strong>{formatPilotRisk(pilotSummary?.riskStatus)}</strong>
          <small>{pilotSummary?.recommendation || 'Continue collecting pilot evidence.'}</small>
        </article>
        <article className="wl-admin-pilot-summary-card">
          <span>Stage</span>
          <strong>
            {pilotSummary?.paidConverted
              ? 'Paid'
              : pilotSummary?.repeatHost
                ? 'Repeat host'
                : pilotSummary?.activated
                  ? 'Activated'
                  : 'Not started'}
          </strong>
          <small>
            {pilotSummary?.planCode || 'No plan code'}
            {pilotSummary?.subscriptionStatus ? ` | ${pilotSummary.subscriptionStatus}` : ''}
          </small>
        </article>
        <article className="wl-admin-pilot-summary-card">
          <span>Support load</span>
          <strong>{pilotSummary?.openSupportCases ?? 0} open</strong>
          <small>
            {pilotSummary?.topOpenSupportCategory
              ? `Top friction: ${formatSupportLabel(pilotSummary.topOpenSupportCategory)}`
              : `Resolved: ${pilotSummary?.resolvedSupportCases ?? 0}`}
          </small>
        </article>
      </section>

      <h3>Sellable readiness</h3>
      <section className="wl-admin-pilot-summary" data-testid="sellable-readiness">
        <article className="wl-admin-pilot-summary-card">
          <span>Signal</span>
          <strong>{sellableReadiness.signal}</strong>
          <small>{sellableReadiness.nextAction}</small>
        </article>
        <article className="wl-admin-pilot-summary-card">
          <span>Revenue evidence</span>
          <strong>{sellableReadiness.paidActivations} paid activations</strong>
          <small>{sellableReadiness.upgradeAttempts} upgrade attempts</small>
        </article>
        <article className="wl-admin-pilot-summary-card">
          <span>Repeat evidence</span>
          <strong>{sellableReadiness.completedSessions} completed</strong>
          <small>{sellableReadiness.launches} launches tracked</small>
        </article>
      </section>
      <ul className="wl-admin-proof-gaps" data-testid="sellable-readiness-gaps">
        {sellableReadiness.proofGaps.length > 0 ? (
          sellableReadiness.proofGaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))
        ) : (
          <li>No immediate proof gaps flagged from current tenant data.</li>
        )}
      </ul>

      <h3>Pilot metrics</h3>
      <div className="wl-admin-pilot-metrics" data-testid="pilot-metrics">
        {pilotMetricLabels.map((metric) => {
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

      <h3>Support cases</h3>
      <form className="wl-admin-form wl-admin-support-form" onSubmit={handleSupportCaseSubmit}>
        <div className="wl-admin-grid-two">
          <div>
            <label htmlFor="support-case-title">Title</label>
            <input
              id="support-case-title"
              value={supportCaseForm.title}
              onChange={(event) => setSupportCaseForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="support-case-owner">Owner</label>
            <input
              id="support-case-owner"
              value={supportCaseForm.owner}
              onChange={(event) => setSupportCaseForm((current) => ({ ...current, owner: event.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="support-case-category">Category</label>
            <select
              id="support-case-category"
              value={supportCaseForm.category}
              onChange={(event) => setSupportCaseForm((current) => ({ ...current, category: event.target.value }))}
            >
              {supportCaseCategoryOptions.map((option) => (
                <option key={option} value={option}>{formatSupportLabel(option)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="support-case-priority">Priority</label>
            <select
              id="support-case-priority"
              value={supportCaseForm.priority}
              onChange={(event) => setSupportCaseForm((current) => ({ ...current, priority: event.target.value }))}
            >
              {supportCasePriorityOptions.map((option) => (
                <option key={option} value={option}>{formatSupportLabel(option)}</option>
              ))}
            </select>
          </div>
        </div>
        <label htmlFor="support-case-summary">Summary</label>
        <textarea
          id="support-case-summary"
          rows={4}
          value={supportCaseForm.summary}
          onChange={(event) => setSupportCaseForm((current) => ({ ...current, summary: event.target.value }))}
        />
        <label htmlFor="support-case-next-step">Next step</label>
        <input
          id="support-case-next-step"
          value={supportCaseForm.nextStep}
          onChange={(event) => setSupportCaseForm((current) => ({ ...current, nextStep: event.target.value }))}
        />
        <div className="wl-admin-actions">
          <button type="submit">Log support case</button>
        </div>
        {supportFeedback ? <p data-testid="support-feedback">{supportFeedback}</p> : null}
      </form>

      <table data-testid="support-cases">
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Owner</th>
            <th>Next step</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {supportCases.map((caseItem) => (
            <tr key={caseItem.caseId}>
              <td>
                <strong>{caseItem.title}</strong>
                <div>{formatSupportLabel(caseItem.category)} | {formatSupportLabel(caseItem.priority)}</div>
                <small>{caseItem.summary}</small>
              </td>
              <td>{formatSupportLabel(caseItem.status)}</td>
              <td>{caseItem.owner || '-'}</td>
              <td>{caseItem.nextStep || '-'}</td>
              <td>
                <button type="button" onClick={() => handleSupportStatusToggle(caseItem)}>
                  {caseItem.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
                </button>
              </td>
            </tr>
          ))}
          {supportCases.length === 0 ? (
            <tr>
              <td colSpan={5}>No support cases logged.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

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
  );
}
