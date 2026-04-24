import { API_BASE } from '../api';
import { MAX_PLAYERS_PER_ROOM } from '../constants/runtime';
import { STRINGS, BUILD_SHA, SHOW_BUILD_BADGE, STARTUP_PHASE } from './appConfig';
import { parsePlayers } from './appSessionUtils';

export function SetupSkeleton({ appTitle }) {
  return (
    <section className="setup-panel board-surface" data-testid="setup-skeleton">
      <h1>{appTitle}</h1>
      <p>{STRINGS.loadingTopics}</p>
      <div className="topic-grid topic-grid--skeleton" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="topic-tile-skeleton" />
        ))}
      </div>
      <button disabled type="button">
        {STRINGS.startRound}
      </button>
    </section>
  );
}

export function PublicLaunchPanel({ onStartTrial, onSignIn }) {
  return (
    <section className="setup-panel board-surface launch-panel" data-testid="launch-panel">
      <p className="section-title">{STRINGS.launchPanelEyebrow}</p>
      <div className="launch-panel-hero">
        <div className="launch-panel-copy">
          <h1>{STRINGS.launchPanelTitle}</h1>
          <p>{STRINGS.launchPanelHint}</p>
          <div className="launch-panel-actions">
            <button type="button" onClick={onStartTrial}>
              {STRINGS.launchPanelPrimaryCta}
            </button>
            <button type="button" className="secondary-action" onClick={onSignIn}>
              {STRINGS.launchPanelSecondaryCta}
            </button>
          </div>
        </div>
        <div className="launch-panel-pricing" aria-label={STRINGS.launchPanelPricingTitle}>
          <article className="launch-plan-card launch-plan-card--trial">
            <p>{STRINGS.launchPanelPricingTrial}</p>
            <strong>Start light</strong>
            <span>{STRINGS.launchPanelPricingTrialDetail}</span>
          </article>
          <article className="launch-plan-card launch-plan-card--pro">
            <p>{STRINGS.launchPanelPricingPro}</p>
            <strong>Recurring host default</strong>
            <span>{STRINGS.launchPanelPricingProDetail}</span>
          </article>
          <article className="launch-plan-card launch-plan-card--team">
            <p>{STRINGS.launchPanelPricingTeam}</p>
            <strong>Not the launch wedge</strong>
            <span>{STRINGS.launchPanelPricingTeamDetail}</span>
          </article>
        </div>
      </div>
      <div className="launch-panel-grid">
        <article className="launch-panel-card">
          <h2>{STRINGS.launchPanelValueTitle}</h2>
          <ul className="launch-panel-list">
            <li>{STRINGS.launchPanelValue1}</li>
            <li>{STRINGS.launchPanelValue2}</li>
            <li>{STRINGS.launchPanelValue3}</li>
          </ul>
        </article>
        <article className="launch-panel-card">
          <h2>{STRINGS.launchPanelAssuranceTitle}</h2>
          <ul className="launch-panel-list">
            <li>{STRINGS.launchPanelAssurance1}</li>
            <li>{STRINGS.launchPanelAssurance2}</li>
            <li>{STRINGS.launchPanelAssurance3}</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

export function BuildBadge({ inline = false }) {
  if (!SHOW_BUILD_BADGE) {
    return null;
  }

  const badgeText = BUILD_SHA ? `DEV BUILD ${BUILD_SHA.slice(0, 7)}` : 'DEV BUILD';
  return (
    <p className={`build-badge${inline ? ' build-badge--inline' : ''}`} data-testid="build-badge">
      {badgeText}
    </p>
  );
}

export function AudioControls({ muted, volume, onToggleMute, onVolumeChange, inline = false }) {
  return (
    <section
      className={`audio-controls board-surface${inline ? ' audio-controls--inline' : ''}`}
      data-testid="audio-controls"
      aria-label="Audio controls"
    >
      <button
        type="button"
        className="audio-toggle"
        onClick={onToggleMute}
        aria-pressed={!muted}
      >
        {muted ? 'Muted' : 'Sound on'}
      </button>
      <label className="audio-volume-label" htmlFor="audio-volume-slider">
        Volume
      </label>
      <input
        id="audio-volume-slider"
        className="audio-volume-slider"
        type="range"
        min="0"
        max="100"
        step="5"
        value={Math.round(volume * 100)}
        onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
        aria-label="Volume"
      />
    </section>
  );
}

export function StartScreen({
  topics,
  config,
  setConfig,
  onStart,
  appTitle,
  runtimeSnapshot,
  runtimeWarning,
  roomMessage = '',
  roomError = '',
  hostLaunchBlocked,
  playerDraft,
  onPlayerDraftChange,
  onCommitPlayerDraft,
  onRemovePlayer,
  showStartButton = true
}) {
  const players = parsePlayers(config.playersText);
  const draftPlayers = parsePlayers(playerDraft);
  const activeTopic = config.topic || 'Any Topic';
  const activeLanguage = String(config.lang || 'en').toUpperCase();
  const tenantId = runtimeSnapshot?.me?.selectedTenantId || '';
  const planCode = runtimeSnapshot?.subscription?.planCode || '';
  const capabilities = runtimeSnapshot?.capabilities || null;
  const maxHostedPlayers = Number.isInteger(capabilities?.maxHostedPlayers)
    ? Math.min(capabilities.maxHostedPlayers, MAX_PLAYERS_PER_ROOM)
    : null;
  const mergedPlayerCount = Array.from(new Set([...players, ...draftPlayers])).length;
  const overHostedPlayerCap = maxHostedPlayers != null && mergedPlayerCount > maxHostedPlayers;
  const canStart = (players.length > 0 || draftPlayers.length > 0) && !overHostedPlayerCap;
  const isHostedRuntime = Boolean(tenantId);
  const topicOptions = [
    { value: '', title: 'Random topic', detail: 'Fast pick - any deck' },
    ...topics.map((topic) => ({
      value: topic.topic,
      title: topic.topic,
      detail: `${topic.count} cards ready`
    }))
  ];
  const selectedTopicIndex = Math.max(topicOptions.findIndex((option) => option.value === config.topic), 0);
  const headerKicker = isHostedRuntime ? 'Launch setup' : 'Topic select';
  const headerTitle = isHostedRuntime ? 'Prepare the next CherryPick session.' : 'Choose the board.';
  const headerCopy = isHostedRuntime
    ? 'Keep the hosted runtime honest: lock the topic, verify the roster, then launch when the room is actually ready.'
    : 'Pick a topic, keep the board readable, and remember that one wrong tile kills the reward.';
  const rosterLabel = isHostedRuntime ? 'Players' : 'Runner alias';
  const rosterHint = isHostedRuntime
    ? STRINGS.addPlayerHint
    : 'Use one runner alias for the cleanest solo loop.';
  const selectTopic = (topic) => setConfig((prev) => ({ ...prev, topic }));
  const handleTopicTileKeyDown = (event, index) => {
    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % topicOptions.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + topicOptions.length) % topicOptions.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = topicOptions.length - 1;
    }

    if (nextIndex == null) {
      return;
    }

    event.preventDefault();
    selectTopic(topicOptions[nextIndex].value);
    const nextButton = event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')?.[nextIndex];
    if (typeof nextButton?.focus === 'function') {
      window.requestAnimationFrame(() => nextButton.focus());
    }
  };

  return (
    <section className="setup-panel board-surface host-launch-panel" data-testid="host-launch-panel">
      <div className={`topic-select-shell${isHostedRuntime ? ' topic-select-shell--hosted' : ' topic-select-shell--solo'}`}>
        <div className={`topic-select-main${isHostedRuntime ? ' topic-select-main--hosted' : ' topic-select-main--solo'}`}>
          <div className="topic-select-header">
            <p className="topic-select-kicker">{headerKicker}</p>
            <h2>{headerTitle}</h2>
            <p>{headerCopy}</p>
            {!isHostedRuntime ? (
              <div className="topic-select-header-bar" data-testid="host-setup-summary">
                <span className="topic-select-chip">Topic {activeTopic}</span>
                <span className="topic-select-chip">Language {activeLanguage}</span>
                <span className="topic-select-chip">8-tile board</span>
              </div>
            ) : null}
          </div>

          {isHostedRuntime ? (
            <div className="topic-select-stats" data-testid="host-setup-summary">
              <article className="topic-select-stat">
                <span>Selected topic</span>
                <strong>{activeTopic}</strong>
              </article>
              <article className="topic-select-stat">
                <span>Language</span>
                <strong>{activeLanguage}</strong>
              </article>
              <article className="topic-select-stat">
                <span>Roster</span>
                <strong>{mergedPlayerCount}</strong>
              </article>
            </div>
          ) : null}

          {!isHostedRuntime ? (
            <section className="board-surface topic-select-card">
              <div className="topic-select-card-copy">
                <div>
                  <p className="topic-select-kicker">Solo run</p>
                  <h3>Lock the runner, then launch.</h3>
                  <p className="home-card-copy">
                    CherryPick stays strongest when the setup is brief: pick a topic, keep the alias clean,
                    and start the board without extra lobby noise.
                  </p>
                </div>
                <div className="topic-select-stats topic-select-stats--solo">
                  <article className="topic-select-stat">
                    <span>Reward state</span>
                    <strong>Starts live</strong>
                  </article>
                  <article className="topic-select-stat">
                    <span>Round risk</span>
                    <strong>One miss ends XP</strong>
                  </article>
                  <article className="topic-select-stat">
                    <span>Runner</span>
                    <strong>{players[0] || draftPlayers[0] || 'Solo Player'}</strong>
                  </article>
                </div>
              </div>
            </section>
          ) : null}

          <p id="topic-options-help" className="sr-only">
            Use the arrow keys to move between topics. Press Enter or Space to keep the selected topic.
          </p>
          <div className="topic-grid" role="radiogroup" aria-label="Topic options" aria-describedby="topic-options-help">
            {topicOptions.map((option, index) => {
              const selected = selectedTopicIndex === index;
              return (
                <button
                  key={option.value || 'random-topic'}
                  type="button"
                  role="radio"
                  className={`topic-tile${selected ? ' selected' : ''}`}
                  onClick={() => selectTopic(option.value)}
                  onKeyDown={(event) => handleTopicTileKeyDown(event, index)}
                  aria-checked={selected}
                  tabIndex={selected ? 0 : -1}
                >
                  <span className="topic-title">{option.title}</span>
                  <span className="topic-count">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isHostedRuntime ? (
          <aside className="topic-select-side">
          <section className="board-surface topic-select-card">
            <div>
              <p className="topic-select-kicker">{isHostedRuntime ? 'Runtime' : 'Solo profile'}</p>
              <h3>{appTitle}</h3>
              <p className="home-card-copy" data-testid={isHostedRuntime ? 'tenant-runtime-hint' : undefined}>
                {isHostedRuntime
                  ? `Tenant runtime active: ${tenantId}${planCode ? ` - plan ${planCode}` : ''}`
                  : 'Local solo progression stays on this browser, so each run feeds the same profile arc.'}
              </p>
            </div>
            <div className="question-card-reward-row">
              <span className="topic-select-chip">All-or-nothing round</span>
              <span className="topic-select-chip">8 answers</span>
              <span className="topic-select-chip">XP progression</span>
            </div>
          </section>

          <section className="board-surface topic-select-card">
            <label htmlFor="players">{rosterLabel}</label>
            <input
              id="players"
              type="text"
              value={playerDraft}
              onChange={(event) => onPlayerDraftChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',') {
                  event.preventDefault();
                  onCommitPlayerDraft(event.currentTarget.value);
                }
              }}
              onBlur={(event) => {
                onCommitPlayerDraft(event.currentTarget.value);
              }}
              placeholder={isHostedRuntime ? STRINGS.playersPlaceholder : 'Solo Player'}
            />
            <div className="players-chips">
              {players.map((player) => (
                <button key={player} className="player-token" type="button" onClick={() => onRemovePlayer(player)}>
                  <span>{player}</span>
                  <span aria-hidden>x</span>
                </button>
              ))}
            </div>
            {overHostedPlayerCap ? (
              <p className="field-hint runtime-warning" data-testid="host-player-cap-warning">
                {STRINGS.hostedPlayerCapUpgrade} {STRINGS.hostedPlayerCapPrefix} {maxHostedPlayers}.
              </p>
            ) : null}
            {players.length === 0 ? <p className="field-hint">{rosterHint}</p> : null}
            <p className="field-hint active-filter" data-testid="active-filter">
              Active filter: {activeTopic} | {activeLanguage}
            </p>
            {runtimeWarning ? (
              <p className="field-hint runtime-warning" data-testid="tenant-runtime-warning">{runtimeWarning}</p>
            ) : null}
            {roomMessage ? <p className="field-hint" data-testid="host-setup-message">{roomMessage}</p> : null}
            {roomError ? <p className="error" data-testid="host-setup-error">{roomError}</p> : null}
          </section>
          </aside>
        ) : (
          <aside className="topic-select-side topic-select-side--solo">
            <section className="board-surface topic-select-card topic-select-card--solo-runner">
              <div>
                <p className="topic-select-kicker">Runner profile</p>
                <h3>{players[0] || draftPlayers[0] || 'Solo Player'}</h3>
                <p className="home-card-copy">Your runner alias is saved locally and feeds the single-player progression loop.</p>
              </div>

              <label htmlFor="players">{rosterLabel}</label>
              <input
                id="players"
                type="text"
                value={playerDraft}
                onChange={(event) => onPlayerDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ',') {
                    event.preventDefault();
                    onCommitPlayerDraft(event.currentTarget.value);
                  }
                }}
                onBlur={(event) => {
                  onCommitPlayerDraft(event.currentTarget.value);
                }}
                placeholder="Solo Player"
              />

              <div className="question-card-reward-row">
                <span className="topic-select-chip">All-or-nothing round</span>
                <span className="topic-select-chip">4 x 2 desktop board</span>
                <span className="topic-select-chip">XP progression</span>
              </div>

              {players.length === 0 ? <p className="field-hint">{rosterHint}</p> : null}
              <p className="field-hint active-filter" data-testid="active-filter">
                Active filter: {activeTopic} | {activeLanguage}
              </p>
              {roomMessage ? <p className="field-hint" data-testid="host-setup-message">{roomMessage}</p> : null}
              {roomError ? <p className="error" data-testid="host-setup-error">{roomError}</p> : null}
            </section>

            <section className="board-surface topic-select-card topic-select-card--solo-daily">
              <div>
                <p className="topic-select-kicker">Daily challenge</p>
                <h3>Start the daily board from home.</h3>
                <p className="home-card-copy">
                  Topic select stays for repeatable practice runs. The daily challenge uses the live runtime too,
                  but records one local result per calendar day from the home module.
                </p>
              </div>
              <div className="topic-select-stats topic-select-stats--solo">
                <article className="topic-select-stat">
                  <span>Status</span>
                  <strong>Live v1</strong>
                </article>
                <article className="topic-select-stat">
                  <span>Today</span>
                  <strong>One board</strong>
                </article>
                <article className="topic-select-stat">
                  <span>Saved</span>
                  <strong>Local profile</strong>
                </article>
              </div>
            </section>
          </aside>
        )}
      </div>

      {showStartButton ? (
        <button className="start-cta" onClick={onStart} disabled={!canStart || hostLaunchBlocked} type="button">
          {STRINGS.startRound}
        </button>
      ) : null}
    </section>
  );
}

export function OnboardingPanel({
  draft,
  pending,
  success,
  error,
  onDraftChange,
  onSubmit,
  workspaceInputRef
}) {
  return (
    <section className="setup-panel board-surface onboarding-panel" data-testid="onboarding-panel">
      <h2>{STRINGS.onboardingTitle}</h2>
      <p>{STRINGS.onboardingHint}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="onboarding-workspace">{STRINGS.onboardingWorkspaceLabel}</label>
        <input
          id="onboarding-workspace"
          ref={workspaceInputRef}
          type="text"
          value={draft.workspaceName}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, workspaceName: event.target.value }))}
          placeholder={STRINGS.onboardingWorkspacePlaceholder}
          autoComplete="organization"
          disabled={pending}
        />

        <label htmlFor="onboarding-email">{STRINGS.onboardingEmailLabel}</label>
        <input
          id="onboarding-email"
          type="email"
          value={draft.ownerEmail}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, ownerEmail: event.target.value }))}
          placeholder={STRINGS.onboardingEmailPlaceholder}
          autoComplete="email"
          disabled={pending}
        />

        <label htmlFor="onboarding-display-name">{STRINGS.onboardingNameLabel}</label>
        <input
          id="onboarding-display-name"
          type="text"
          value={draft.ownerDisplayName}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, ownerDisplayName: event.target.value }))}
          placeholder={STRINGS.onboardingNamePlaceholder}
          autoComplete="name"
          disabled={pending}
        />

        <button type="submit" disabled={pending}>
          {pending ? STRINGS.onboardingSubmitting : STRINGS.onboardingSubmit}
        </button>
      </form>

      {success ? <p className="field-hint" data-testid="onboarding-success">{STRINGS.onboardingSuccess}</p> : null}
      {error ? <p className="error" data-testid="onboarding-error">{error}</p> : null}
    </section>
  );
}

export function SignInPanel({
  draft,
  pending,
  success,
  error,
  onDraftChange,
  onSubmit,
  emailInputRef
}) {
  return (
    <section className="setup-panel board-surface onboarding-panel" data-testid="signin-panel">
      <h2>{STRINGS.signInTitle}</h2>
      <p>{STRINGS.signInHint}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="signin-email">{STRINGS.signInEmailLabel}</label>
        <input
          id="signin-email"
          ref={emailInputRef}
          type="email"
          value={draft.email}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, email: event.target.value }))}
          placeholder={STRINGS.signInEmailPlaceholder}
          autoComplete="email"
          disabled={pending}
        />

        <label htmlFor="signin-tenant-id">{STRINGS.signInTenantLabel}</label>
        <input
          id="signin-tenant-id"
          type="text"
          value={draft.tenantId}
          onChange={(event) => onDraftChange((prev) => ({ ...prev, tenantId: event.target.value }))}
          placeholder={STRINGS.signInTenantPlaceholder}
          autoComplete="off"
          disabled={pending}
        />

        <button type="submit" disabled={pending}>
          {pending ? STRINGS.signInSubmitting : STRINGS.signInSubmit}
        </button>
      </form>

      {success ? <p className="field-hint" data-testid="signin-success">{success}</p> : null}
      {error ? <p className="error" data-testid="signin-error">{error}</p> : null}
    </section>
  );
}

export function StartupStatePanel({ startup, onRetry, appTitle }) {
  if (startup.phase === STARTUP_PHASE.READY) {
    return null;
  }

  if (startup.phase === STARTUP_PHASE.LOADING) {
    return <SetupSkeleton appTitle={appTitle} />;
  }

  if (startup.phase === STARTUP_PHASE.WARMING) {
    return (
      <section className="setup-panel board-surface startup-panel" data-testid="startup-warming-panel">
        <h1>{appTitle}</h1>
        <div className="error-panel error-panel--warming">
          <p className="error">{startup.error?.title ?? STRINGS.backendWarmupTitle}</p>
          <p>{startup.error?.detail ?? STRINGS.backendWarmupDetail}</p>
        </div>
        {startup.warmup?.attempt ? (
          <p className="startup-hint" data-testid="startup-warming-attempt">
            Retry {startup.warmup.attempt} of {startup.warmup.totalAttempts}
          </p>
        ) : null}
        <p className="startup-hint">
          {STRINGS.checkBackendUrl} <code>{API_BASE || '(missing VITE_API_BASE_URL)'}</code>
        </p>
        {API_BASE ? (
          <a className="inline-link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">
            {STRINGS.openHealth}
          </a>
        ) : null}
      </section>
    );
  }

  if (startup.phase === STARTUP_PHASE.TOPICS_EMPTY) {
    return (
      <section className="setup-panel board-surface startup-panel">
        <h1>{appTitle}</h1>
        <p className="error">{STRINGS.noTopics}</p>
        <p>{STRINGS.noTopicsHint}</p>
        <button type="button" onClick={onRetry}>
          {STRINGS.retry}
        </button>
      </section>
    );
  }

  return (
    <section className="setup-panel board-surface startup-panel">
      <h1>{appTitle}</h1>
      <div className="error-panel">
        <p className="error">{startup.error?.title ?? 'Could not load topics.'}</p>
        <p>{startup.error?.detail}</p>
      </div>
      <button type="button" onClick={onRetry}>
        {STRINGS.retry}
      </button>
      <p className="startup-hint">
        {STRINGS.checkBackendUrl} <code>{API_BASE || '(missing VITE_API_BASE_URL)'}</code>
      </p>
      {API_BASE ? (
        <a className="inline-link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">
          {STRINGS.openHealth}
        </a>
      ) : null}
    </section>
  );
}

export function AdminConsoleDisabled() {
  return (
    <main className="app-shell startup-root">
      <section className="board-surface" data-testid="admin-console-disabled">
        <p className="kicker">{STRINGS.adminConsoleDisabledTitle}</p>
        <h1>{STRINGS.title}</h1>
        <p>{STRINGS.adminConsoleDisabledDetail}</p>
        <p>{STRINGS.adminConsoleDisabledHint}</p>
      </section>
    </main>
  );
}
