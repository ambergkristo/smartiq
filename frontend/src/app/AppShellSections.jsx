import GameRoom from '../components/GameRoom';
import HostDashboard from '../components/HostDashboard';
import JoinGameScreen from '../components/home/JoinGameScreen';
import HostGameScreen from '../components/home/HostGameScreen';
import GameplayActionBar from '../components/gameplay/GameplayActionBar';
import ScoreBoard from '../components/gameplay/ScoreBoard';
import LobbySupportPanel from '../components/room/LobbySupportPanel';
import PrimaryActionBar from '../components/shell/PrimaryActionBar';
import SidePanel from '../components/shell/SidePanel';
import { AudioControls } from './AppPanels';

export function HostLanguageControl({ languages, selectedLanguage, onSelectLanguage }) {
  return (
    <div className="host-language-switch" role="group" aria-label="Host language">
      {languages.map((lang) => {
        const selected = selectedLanguage === lang;
        return (
          <button
            key={lang}
            type="button"
            className={`host-language-chip${selected ? ' is-selected' : ''}`}
            aria-pressed={selected}
            onClick={() => onSelectLanguage(lang)}
          >
            {lang.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export function HostUtilityArea({
  muted,
  volume,
  onToggleMute,
  onVolumeChange
}) {
  return (
    <div className="host-utility-strip">
      <AudioControls
        muted={muted}
        volume={volume}
        onToggleMute={onToggleMute}
        onVolumeChange={onVolumeChange}
        inline
      />
      <span className="host-settings-chip">Single theme</span>
    </div>
  );
}

export function SharedRoomPanelSection(props) {
  return <GameRoom {...props} />;
}

export function LaunchConsolePanelSection(props) {
  return <props.StartScreenComponent {...props.startScreenProps} />;
}

export function JoinEntryPanelSection(props) {
  return <JoinGameScreen {...props} />;
}

export function HostEntryPanelSection(props) {
  return <HostGameScreen {...props} />;
}

export function SetupActionBarSection({
  roomSession,
  hostRoomSession,
  setupMergedPlayerCount,
  selectedRoomPlayers,
  roomPlayerCount,
  roomPending,
  hostLaunchBlocked,
  setupOverHostedPlayerCap,
  hostRoomLifecycle,
  strings,
  onStartSetupRound,
  onStartRoomSession
}) {
  if (!roomSession) {
    return (
      <PrimaryActionBar>
        <div className="app-shell-action-copy">
          <span>Primary action</span>
          <strong>{setupMergedPlayerCount > 0 ? `${setupMergedPlayerCount} ready for the board` : 'Choose a topic to begin'}</strong>
        </div>
        <button
          type="button"
          className="app-shell-primary-button"
          onClick={onStartSetupRound}
          disabled={setupMergedPlayerCount === 0 || hostLaunchBlocked || setupOverHostedPlayerCap}
        >
          {strings.startRound}
        </button>
      </PrimaryActionBar>
    );
  }

  if (hostRoomSession) {
    return (
      <PrimaryActionBar>
        <div className="app-shell-action-copy">
          <span>Lobby status</span>
          <strong>
            {`${roomPlayerCount} joined${selectedRoomPlayers.length !== roomPlayerCount ? ` • ${selectedRoomPlayers.length} selected` : ''}`}
          </strong>
        </div>
        <button
          type="button"
          className="app-shell-primary-button"
          onClick={onStartRoomSession}
          disabled={roomPending || selectedRoomPlayers.length === 0 || hostLaunchBlocked || hostRoomLifecycle === 'LIVE'}
        >
          {hostRoomLifecycle === 'LIVE' ? 'Game live' : strings.startRound}
        </button>
      </PrimaryActionBar>
    );
  }

  return (
    <PrimaryActionBar>
      <div className="app-shell-action-copy">
        <span>Player lobby</span>
        <strong>{roomSession?.roomCode ? `Room ${roomSession.roomCode}` : 'Room active'}</strong>
      </div>
    </PrimaryActionBar>
  );
}

export function HostLobbySupportPanelSection({
  roomCode,
  joinLink,
  onResumeRoom,
  pending,
  onBackHome
}) {
  return (
    <LobbySupportPanel
      roomCode={roomCode}
      joinLink={joinLink}
      onResumeRoom={onResumeRoom}
      pending={pending}
      onBackHome={onBackHome}
    />
  );
}

export function HostRuntimePanelsSection({
  runtimeSnapshot,
  roomSession,
  appTitle,
  planCode,
  planStatus,
  checkoutPending,
  checkoutMessage,
  checkoutUrl,
  handleLogout,
  canUpgrade,
  handleUpgradeCheckout,
  hostLaunchBlocked,
  strings,
  maxHostedPlayers,
  planLimit,
  analyticsHistoryEnabled,
  usageRow,
  workspacePending,
  workspaceError,
  workspaceMessage,
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
  setupMergedPlayerCount,
  canManageBrandingRole,
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
  if (!runtimeSnapshot || roomSession?.role === 'player') {
    return null;
  }

  return (
    <>
      <section className="setup-panel board-surface host-console-status-card" data-testid="host-console-status-card">
        <div className="host-console-status-head">
          <div>
            <p className="section-title">Console status</p>
            <h2>{appTitle}</h2>
          </div>
          <div className="host-plan-chip">
            <span>{planCode || 'trial'}</span>
            <strong>{formatSubscriptionStatus(planStatus)}</strong>
          </div>
        </div>
        <div className="host-console-status-actions">
          {typeof handleLogout === 'function' ? (
            <button type="button" className="secondary-action" onClick={handleLogout}>
              {strings.signOutSubmit}
            </button>
          ) : null}
          {canUpgrade ? (
            <button type="button" onClick={handleUpgradeCheckout} disabled={checkoutPending}>
              {checkoutPending ? strings.upgradeSubmitting : hostLaunchBlocked ? strings.upgradeRecoverySubmit : strings.upgradeSubmit}
            </button>
          ) : null}
        </div>
        {checkoutMessage ? <p className="field-hint" data-testid="upgrade-message">{checkoutMessage}</p> : null}
        {checkoutUrl ? (
          <a className="inline-link" data-testid="checkout-link" href={checkoutUrl}>
            {strings.upgradeContinueSubmit}
          </a>
        ) : null}
      </section>
      <HostDashboard
        strings={strings}
        appTitle={appTitle}
        planCode={planCode}
        planStatus={planStatus}
        billingCycle={runtimeSnapshot?.subscription?.billingCycle}
        maxHostedPlayers={maxHostedPlayers}
        planLimit={planLimit}
        analyticsHistoryEnabled={analyticsHistoryEnabled}
        usageRow={usageRow}
        workspacePending={workspacePending}
        workspaceError={workspaceError}
        workspaceMessage={workspaceMessage}
        hostLaunchBlocked={hostLaunchBlocked}
        hostLaunchMessage={hostLaunchMessage}
        hostWorkspaceAnalytics={hostWorkspaceAnalytics}
        customBrandingEnabled={customBrandingEnabled}
        brandingDraft={brandingDraft}
        brandingPending={brandingPending}
        brandingMessage={brandingMessage}
        brandingError={brandingError}
        sessionReviewNotes={sessionReviewNotes}
        sessionTemplatesEnabled={sessionTemplatesEnabled}
        sessionTemplateDraft={sessionTemplateDraft}
        sessionTemplatePending={sessionTemplatePending}
        sessionTemplateMessage={sessionTemplateMessage}
        sessionTemplateError={sessionTemplateError}
        sessionTemplates={sessionTemplates}
        visibleHostedSessions={visibleHostedSessions}
        auditEvents={auditEvents}
        activeHostedSession={activeHostedSession}
        hostedSessionFilter={hostedSessionFilter}
        reviewedHostedSession={reviewedHostedSession}
        reviewedHostedSessionNote={reviewedHostedSessionNote}
        reviewedHostedSessionNoteMessage={reviewedHostedSessionNoteMessage}
        canUpgrade={canUpgrade}
        canSaveTemplate={setupMergedPlayerCount > 0}
        upgradePending={checkoutPending}
        canManageBrandingRole={canManageBrandingRole}
        onUpgrade={handleUpgradeCheckout}
        onBrandingDraftChange={onBrandingDraftChange}
        onSaveBranding={onSaveBranding}
        onSessionTemplateDraftChange={onSessionTemplateDraftChange}
        onSaveTemplate={onSaveTemplate}
        onApplySessionTemplate={onApplySessionTemplate}
        onDeleteSessionTemplate={onDeleteSessionTemplate}
        onHostedSessionFilterChange={onHostedSessionFilterChange}
        onUseRecentHostedSession={onUseRecentHostedSession}
        onReviewRecentHostedSession={onReviewRecentHostedSession}
        onResumeRecentHostedSession={onResumeRecentHostedSession}
        onLaunchRecentHostedSession={onLaunchRecentHostedSession}
        onSaveRecentHostedSessionAsTemplate={onSaveRecentHostedSessionAsTemplate}
        onReviewedHostedSessionNoteChange={onReviewedHostedSessionNoteChange}
        onSaveReviewedHostedSessionNote={onSaveReviewedHostedSessionNote}
        onClearReviewedHostedSessionNote={onClearReviewedHostedSessionNote}
        canLaunchRecentHostedSessions={canLaunchRecentHostedSessions}
        formatSubscriptionStatus={formatSubscriptionStatus}
        formatAuditAction={formatAuditAction}
        resolveSessionReviewNote={resolveSessionReviewNote}
        formatSessionReviewNotePreview={formatSessionReviewNotePreview}
      />
    </>
  );
}

export function GameplaySidePanelSection({
  engine,
  activeError,
  soloModeActive,
  playerProfile,
  gameplayPhaseLabel
}) {
  return (
    <SidePanel>
      <ScoreBoard
        players={engine.players}
        scores={engine.scores}
        currentPlayerIndex={engine.currentPlayerIndex}
        roundNumber={engine.roundNumber}
        lastAction={activeError ? '' : engine.lastAction}
        phaseLabel={gameplayPhaseLabel}
        currentPlayer={engine.currentPlayer}
        targetScore={engine.targetScore}
        eliminatedPlayers={engine.eliminatedPlayers}
        starterPlayer={engine.players[engine.starterIndex] ?? engine.currentPlayer}
        mode={soloModeActive ? 'solo' : 'standard'}
        sessionXp={engine.sessionXp}
        lastRoundXp={engine.lastRoundXp}
        profileName={playerProfile.displayName}
        profileLevel={playerProfile.level}
        profileXp={playerProfile.totalXp}
        profileGamesPlayed={playerProfile.gamesPlayed}
        profileRoundsWon={playerProfile.roundsWon}
      />
    </SidePanel>
  );
}

export function GameplayActionBarSection({
  engine,
  gameplayCategory,
  controlsDisabled,
  gameplayCanAnswer,
  hostRoomSession,
  onRestart
}) {
  return (
    <PrimaryActionBar>
      <GameplayActionBar
        phase={engine.phase}
        category={gameplayCategory}
        nextTransition={engine.nextTransition}
        controlsDisabled={controlsDisabled}
        canAnswer={gameplayCanAnswer}
        onAnswer={engine.requestConfirm}
        onConfirm={engine.confirmAnswer}
        onCancelConfirm={engine.cancelConfirm}
        onNext={engine.nextStep}
        onBackToLobby={onRestart}
        backLabel={hostRoomSession ? 'Back to lobby' : 'Back to setup'}
        currentPlayer={engine.currentPlayer}
      />
    </PrimaryActionBar>
  );
}
