export default function HostDashboard({
  strings,
  appTitle,
  planCode,
  planStatus,
  billingCycle,
  maxHostedPlayers,
  planLimit,
  analyticsHistoryEnabled,
  usageRow,
  workspacePending,
  workspaceError,
  workspaceMessage,
  hostLaunchBlocked,
  hostLaunchMessage,
  hostWorkspaceAnalytics,
  customBrandingEnabled,
  brandingDraft,
  brandingPending,
  brandingMessage,
  brandingError,
  sessionReviewNotes,
  sessionTemplatesEnabled,
  sessionTemplateDraft,
  sessionTemplatePending,
  sessionTemplateMessage,
  sessionTemplateError,
  sessionTemplates,
  visibleHostedSessions,
  auditEvents,
  activeHostedSession,
  hostedSessionFilter,
  reviewedHostedSession,
  reviewedHostedSessionNote,
  reviewedHostedSessionNoteMessage,
  canUpgrade,
  canSaveTemplate,
  upgradePending,
  canManageBrandingRole,
  onUpgrade,
  onBrandingDraftChange,
  onSaveBranding,
  onSessionTemplateDraftChange,
  onSaveTemplate,
  onApplySessionTemplate,
  onDeleteSessionTemplate,
  onHostedSessionFilterChange,
  onUseRecentHostedSession,
  onReviewRecentHostedSession,
  onResumeRecentHostedSession,
  onLaunchRecentHostedSession,
  onSaveRecentHostedSessionAsTemplate,
  onReviewedHostedSessionNoteChange,
  onSaveReviewedHostedSessionNote,
  onClearReviewedHostedSessionNote,
  canLaunchRecentHostedSessions,
  formatSubscriptionStatus,
  formatAuditAction,
  resolveSessionReviewNote,
  formatSessionReviewNotePreview
}) {
  return (
    <section className="host-workspace board-surface" data-testid="host-workspace-panel">
      <div className="host-workspace-header">
        <div>
          <h2>{strings.hostWorkspaceTitle}</h2>
          <p>{strings.hostWorkspaceHint}</p>
        </div>
        <div className="host-plan-chip">
          <span>{planCode || 'trial'}</span>
          <strong>{formatSubscriptionStatus(planStatus)}</strong>
        </div>
      </div>
      {workspacePending ? <p className="field-hint">{strings.hostWorkspaceLoading}</p> : null}
      {hostLaunchBlocked ? (
        <p className="error" data-testid="host-launch-blocked">{hostLaunchMessage || strings.hostedRuntimeBlocked}</p>
      ) : null}
      {workspaceError ? (
        <p className="error" data-testid="workspace-error">{workspaceError}</p>
      ) : null}
      {workspaceMessage ? (
        <p className="field-hint" data-testid="workspace-message">{workspaceMessage}</p>
      ) : null}
      <div className="host-workspace-grid">
        <section className="host-workspace-card">
          <h3>Plan</h3>
          <p className="field-hint">Billing cycle: {billingCycle || 'not set'}</p>
          <p className="field-hint">{strings.hostedPlayerCapPrefix} {maxHostedPlayers == null ? 'not mapped yet' : maxHostedPlayers}</p>
          <p className="field-hint">Usage cap: {planLimit == null ? 'unbounded / not mapped yet' : `${planLimit} tracked events / period`}</p>
          <p className="field-hint">
            Round usage: {!analyticsHistoryEnabled ? strings.hostWorkspaceAnalyticsLocked : usageRow ? `${usageRow.totalValue} across ${usageRow.eventCount} events` : strings.hostWorkspaceNoUsage}
          </p>
        </section>
        <section className="host-workspace-card" data-testid="host-workspace-analytics-card">
          <h3>{strings.hostWorkspaceAnalyticsTitle}</h3>
          <p className="field-hint">
            {!analyticsHistoryEnabled ? strings.hostWorkspaceAnalyticsLocked : strings.hostWorkspaceAnalyticsHint}
          </p>
          {!analyticsHistoryEnabled ? (
            <p className="field-hint">{strings.hostWorkspaceAnalyticsLocked}</p>
          ) : (
            <>
              <div className="host-analytics-metric-grid">
                <article className="host-analytics-metric">
                  <span>{strings.hostWorkspaceAnalyticsRecentRuns}</span>
                  <strong>{hostWorkspaceAnalytics.totalSessions}</strong>
                </article>
                <article className="host-analytics-metric">
                  <span>{strings.hostWorkspaceAnalyticsCompletedRuns}</span>
                  <strong>{hostWorkspaceAnalytics.completedSessions}</strong>
                </article>
                <article className="host-analytics-metric">
                  <span>{strings.hostWorkspaceAnalyticsAverageRoster}</span>
                  <strong>{hostWorkspaceAnalytics.averagePlayers == null ? 'n/a' : hostWorkspaceAnalytics.averagePlayers}</strong>
                </article>
                <article className="host-analytics-metric">
                  <span>{strings.hostWorkspaceAnalyticsSavedTemplates}</span>
                  <strong>{hostWorkspaceAnalytics.templateCount}</strong>
                </article>
                <article className="host-analytics-metric">
                  <span>{strings.hostWorkspaceAnalyticsFollowUpQueue}</span>
                  <strong>{hostWorkspaceAnalytics.followUpSessions}</strong>
                </article>
              </div>
              <div className="host-analytics-summary-list">
                <p className="field-hint">{strings.hostWorkspaceAnalyticsLiveRuns}: {hostWorkspaceAnalytics.liveSessions}</p>
                <p className="field-hint">{strings.hostWorkspaceAnalyticsTopTopic}: {hostWorkspaceAnalytics.topTopic}</p>
                <p className="field-hint">{strings.hostWorkspaceAnalyticsLatestWinner}: {hostWorkspaceAnalytics.latestWinner}</p>
              </div>
            </>
          )}
        </section>
        <section className="host-workspace-card" data-testid="branding-editor-card">
          <h3>{strings.brandingEditorTitle}</h3>
          <p className="field-hint">
            {customBrandingEnabled ? strings.brandingEditorHint : strings.brandingLockedHint}
          </p>
          <div className="branding-preview">
            <strong>{brandingDraft.appName || appTitle}</strong>
            <div className="branding-swatch-row" aria-hidden>
              <span className="branding-swatch" style={{ backgroundColor: brandingDraft.primaryColor }} />
              <span className="branding-swatch" style={{ backgroundColor: brandingDraft.secondaryColor }} />
            </div>
          </div>
          {!customBrandingEnabled ? (
            <div className="branding-locked-state" data-testid="branding-locked">
              <p className="field-hint">{strings.brandingLockedHint}</p>
              {canUpgrade ? (
                <button type="button" className="secondary-action" onClick={onUpgrade} disabled={upgradePending}>
                  {upgradePending ? strings.upgradeSubmitting : strings.upgradeSubmit}
                </button>
              ) : null}
            </div>
          ) : !canManageBrandingRole ? (
            <p className="field-hint" data-testid="branding-role-hint">{strings.brandingRoleHint}</p>
          ) : (
            <>
              <div className="branding-form-grid">
                <label htmlFor="branding-app-name">{strings.brandingAppNameLabel}</label>
                <input
                  id="branding-app-name"
                  type="text"
                  value={brandingDraft.appName}
                  onChange={(event) => onBrandingDraftChange('appName', event.target.value)}
                  disabled={brandingPending}
                />
                <label htmlFor="branding-logo-url">{strings.brandingLogoUrlLabel}</label>
                <input
                  id="branding-logo-url"
                  type="text"
                  value={brandingDraft.logoUrl}
                  onChange={(event) => onBrandingDraftChange('logoUrl', event.target.value)}
                  disabled={brandingPending}
                />
                <label htmlFor="branding-primary-color">{strings.brandingPrimaryColorLabel}</label>
                <input
                  id="branding-primary-color"
                  type="text"
                  value={brandingDraft.primaryColor}
                  onChange={(event) => onBrandingDraftChange('primaryColor', event.target.value)}
                  disabled={brandingPending}
                />
                <label htmlFor="branding-secondary-color">{strings.brandingSecondaryColorLabel}</label>
                <input
                  id="branding-secondary-color"
                  type="text"
                  value={brandingDraft.secondaryColor}
                  onChange={(event) => onBrandingDraftChange('secondaryColor', event.target.value)}
                  disabled={brandingPending}
                />
              </div>
              <div className="host-session-actions">
                <button type="button" onClick={onSaveBranding} disabled={brandingPending}>
                  {brandingPending ? strings.brandingSaving : strings.brandingSaveSubmit}
                </button>
              </div>
            </>
          )}
          {brandingMessage ? <p className="field-hint" data-testid="branding-message">{brandingMessage}</p> : null}
          {brandingError ? <p className="error" data-testid="branding-error">{brandingError}</p> : null}
        </section>
        <section className="host-workspace-card" data-testid="session-templates-card">
          <h3>{strings.sessionTemplatesTitle}</h3>
          <p className="field-hint">
            {sessionTemplatesEnabled ? strings.sessionTemplatesHint : strings.sessionTemplatesLockedHint}
          </p>
          {!sessionTemplatesEnabled ? (
            <div className="branding-locked-state" data-testid="session-templates-locked">
              <p className="field-hint">{strings.sessionTemplatesLockedHint}</p>
              {canUpgrade ? (
                <button type="button" className="secondary-action" onClick={onUpgrade} disabled={upgradePending}>
                  {upgradePending ? strings.upgradeSubmitting : strings.upgradeSubmit}
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="branding-form-grid">
                <label htmlFor="session-template-name">{strings.sessionTemplatesNameLabel}</label>
                <input
                  id="session-template-name"
                  type="text"
                  placeholder={strings.sessionTemplatesNamePlaceholder}
                  value={sessionTemplateDraft.name}
                  onChange={(event) => onSessionTemplateDraftChange(event.target.value)}
                  disabled={sessionTemplatePending}
                />
              </div>
              <div className="host-session-actions">
                <button
                  type="button"
                  onClick={onSaveTemplate}
                  disabled={sessionTemplatePending || !sessionTemplateDraft.name.trim() || !canSaveTemplate}
                >
                  {sessionTemplatePending ? strings.sessionTemplatesSaving : strings.sessionTemplatesSaveSubmit}
                </button>
              </div>
              {sessionTemplates.length > 0 ? (
                <ul className="host-activity-list session-template-list">
                  {sessionTemplates.map((template) => (
                    <li key={template.templateId}>
                      <strong>{template.name}</strong>
                      <span>
                        {(template.topic || strings.recentHostedSessionTopicFallback)}
                        {template.language ? ` | ${template.language.toUpperCase()}` : ''}
                        {template.theme ? ` | ${template.theme}` : ''}
                        {template.players.length > 0 ? ` | ${template.players.length} ${strings.recentHostedSessionPlayers}` : ''}
                      </span>
                      <span className="session-template-players">{template.players.join(', ')}</span>
                      <div className="host-session-actions">
                        <button type="button" onClick={() => onApplySessionTemplate(template)}>
                          {strings.sessionTemplatesApplySubmit}
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onDeleteSessionTemplate(template)}
                          disabled={sessionTemplatePending}
                        >
                          {strings.sessionTemplatesDeleteSubmit}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="field-hint">{strings.sessionTemplatesEmpty}</p>
              )}
            </>
          )}
          {sessionTemplateMessage ? <p className="field-hint" data-testid="session-template-message">{sessionTemplateMessage}</p> : null}
          {sessionTemplateError ? <p className="error" data-testid="session-template-error">{sessionTemplateError}</p> : null}
        </section>
        <section className="host-workspace-card">
          <h3>Recent activity</h3>
          {!analyticsHistoryEnabled ? (
            <p className="field-hint">{strings.hostWorkspaceAnalyticsLocked}</p>
          ) : Array.isArray(auditEvents) && auditEvents.length > 0 ? (
            <ul className="host-activity-list">
              {auditEvents.slice(0, 5).map((entry) => (
                <li key={entry.auditEventId || `${entry.action}-${entry.eventTime}`}>
                  <strong>{formatAuditAction(entry.action)}</strong>
                  <span>{entry.entityId || entry.metadata?.roomCode || entry.metadata?.gameId || 'tenant'}</span>
                </li>
              ))}
            </ul>
          ) : (
            !workspacePending ? <p className="field-hint">{strings.hostWorkspaceNoActivity}</p> : null
          )}
        </section>
        <section className="host-workspace-card">
          <h3>{strings.recentHostedSessionsTitle}</h3>
          <div className="host-session-filter-row" role="tablist" aria-label="Hosted session filter">
            {[
              { value: 'all', label: strings.recentHostedSessionFilterAll },
              { value: 'live', label: strings.recentHostedSessionFilterLive },
              { value: 'completed', label: strings.recentHostedSessionFilterCompleted },
              { value: 'notes', label: strings.recentHostedSessionFilterNotes }
            ].map((entry) => (
              <button
                key={entry.value}
                type="button"
                className={`session-filter-chip${hostedSessionFilter === entry.value ? ' selected' : ''}`}
                aria-pressed={hostedSessionFilter === entry.value}
                onClick={() => onHostedSessionFilterChange(entry.value)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {!analyticsHistoryEnabled ? (
            <p className="field-hint">{strings.hostWorkspaceAnalyticsLocked}</p>
          ) : visibleHostedSessions.length > 0 ? (
            <ul className="host-activity-list">
              {visibleHostedSessions.map((entry) => {
                const savedNote = resolveSessionReviewNote(sessionReviewNotes, entry.gameId);
                const notePreview = formatSessionReviewNotePreview(savedNote);
                return (
                  <li
                    key={entry.gameId}
                    className={activeHostedSession?.gameId === entry.gameId ? 'selected' : ''}
                  >
                    <strong>
                      {entry.topic || strings.recentHostedSessionTopicFallback}
                      <span className={`session-status-badge${entry.status === 'completed' ? ' is-completed' : ''}`}>
                        {entry.status === 'completed'
                          ? strings.recentHostedSessionStatusCompletedBadge
                          : strings.recentHostedSessionStatusLiveBadge}
                      </span>
                      {notePreview ? (
                        <span className="session-status-badge session-status-badge--note">
                          {strings.recentHostedSessionNoteBadge}
                        </span>
                      ) : null}
                    </strong>
                    <span>
                      {entry.gameId}
                      {entry.language ? ` | ${entry.language.toUpperCase()}` : ''}
                      {entry.playerCount != null ? ` | ${entry.playerCount} ${strings.recentHostedSessionPlayers}` : ''}
                      {entry.winnerDisplayName ? ` | winner ${entry.winnerDisplayName}` : ''}
                    </span>
                    {notePreview ? <p className="field-hint recent-session-note-preview">{notePreview}</p> : null}
                    {typeof onUseRecentHostedSession === 'function' ? (
                      <div className="host-session-actions">
                        <button type="button" onClick={() => onUseRecentHostedSession(entry)}>
                          {strings.recentHostedSessionApplySubmit}
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onReviewRecentHostedSession(entry)}
                          disabled={!entry.gameId}
                        >
                          {strings.recentHostedSessionReviewSubmit}
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onResumeRecentHostedSession(entry)}
                          disabled={!entry.gameId || hostLaunchBlocked}
                        >
                          {strings.recentHostedSessionResumeSubmit}
                        </button>
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => onLaunchRecentHostedSession(entry)}
                          disabled={!canLaunchRecentHostedSessions(entry)}
                        >
                          {strings.recentHostedSessionLaunchSubmit}
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            !workspacePending ? <p className="field-hint">{strings.recentHostedSessionsEmpty}</p> : null
          )}
        </section>
        <section className="host-workspace-card recent-hosted-session-review" data-testid="recent-hosted-session-review">
          <h3>{strings.recentHostedSessionReviewTitle}</h3>
          {reviewedHostedSession ? (
            <>
              <strong>{reviewedHostedSession.topic || strings.recentHostedSessionTopicFallback}</strong>
              <p className="field-hint">
                {reviewedHostedSession.gameId}
                {reviewedHostedSession.language ? ` | ${reviewedHostedSession.language.toUpperCase()}` : ''}
                {` | round ${reviewedHostedSession.roundNumber}`}
                {` | ${reviewedHostedSession.phase}`}
              </p>
              <p className="recent-session-question">
                {reviewedHostedSession.question || strings.recentHostedSessionReviewQuestionFallback}
              </p>
              <p className="field-hint">
                Last action: {reviewedHostedSession.lastAction || strings.recentHostedSessionReviewLastActionFallback}
              </p>
              <div className="recent-session-meta-grid">
                <p className="field-hint">
                  {strings.recentHostedSessionStatusPrefix} {reviewedHostedSession.isCompleted ? strings.recentHostedSessionStatusCompleted : strings.recentHostedSessionStatusLive}
                </p>
                <p className="field-hint">
                  {strings.recentHostedSessionLeaderPrefix} {reviewedHostedSession.leaderDisplayName || 'n/a'}{reviewedHostedSession.leaderDisplayName ? ` (${reviewedHostedSession.leaderScore} pts)` : ''}
                </p>
              </div>
              {activeHostedSession ? (
                <div className="host-session-actions host-session-actions--detail">
                  <button type="button" onClick={() => onUseRecentHostedSession(activeHostedSession)}>
                    {strings.recentHostedSessionApplySubmit}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => onReviewRecentHostedSession(activeHostedSession)}
                  >
                    {strings.recentHostedSessionRefreshSubmit}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => onResumeRecentHostedSession(activeHostedSession)}
                    disabled={hostLaunchBlocked}
                  >
                    {strings.recentHostedSessionResumeSubmit}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={() => onLaunchRecentHostedSession(activeHostedSession)}
                    disabled={!canLaunchRecentHostedSessions(activeHostedSession)}
                  >
                    {strings.recentHostedSessionLaunchSubmit}
                  </button>
                  {sessionTemplatesEnabled && typeof onSaveRecentHostedSessionAsTemplate === 'function' ? (
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => onSaveRecentHostedSessionAsTemplate(activeHostedSession)}
                      disabled={sessionTemplatePending}
                    >
                      {strings.sessionTemplatesSaveFromHistorySubmit}
                    </button>
                  ) : null}
                </div>
              ) : null}
              <ul className="recent-session-scoreboard">
                {reviewedHostedSession.scoreboard.map((entry) => (
                  <li key={entry.playerId || entry.displayName}>
                    <strong>{entry.displayName}</strong>
                    <span>{entry.score} pts</span>
                  </li>
                ))}
              </ul>
              <div className="recent-session-note-editor">
                <label htmlFor="recent-session-note">{strings.recentHostedSessionNotesTitle}</label>
                <textarea
                  id="recent-session-note"
                  rows="3"
                  value={reviewedHostedSessionNote}
                  onChange={(event) => onReviewedHostedSessionNoteChange(event.target.value)}
                  placeholder={strings.recentHostedSessionNotesPlaceholder}
                />
                <div className="host-session-actions host-session-actions--detail">
                  <button type="button" onClick={onSaveReviewedHostedSessionNote}>
                    {strings.recentHostedSessionNotesSaveSubmit}
                  </button>
                  <button
                    type="button"
                    className="secondary-action"
                    onClick={onClearReviewedHostedSessionNote}
                    disabled={!reviewedHostedSessionNote.trim()}
                  >
                    {strings.recentHostedSessionNotesClearSubmit}
                  </button>
                </div>
                {reviewedHostedSessionNoteMessage ? (
                  <p className="field-hint" data-testid="recent-session-note-message">{reviewedHostedSessionNoteMessage}</p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="field-hint">{strings.recentHostedSessionReviewEmpty}</p>
          )}
        </section>
      </div>
    </section>
  );
}
