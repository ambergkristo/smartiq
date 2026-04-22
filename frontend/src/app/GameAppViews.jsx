import AppHeader from '../components/shell/AppHeader';
import AppShell from '../components/shell/AppShell';
import MainStage from '../components/shell/MainStage';

export function SetupPhaseView({
  activePlayerRouteRoomCode,
  playerRouteMatchesSavedPlayerSession,
  playerWaitingShell,
  playerJoinElement,
  startup,
  startupReady,
  topics,
  showProductHome,
  entryRoute,
  homeRoute,
  joinRoute,
  hostRoute,
  hostTrialRoute,
  hostSignInRoute,
  startRoute,
  roomSession,
  startupStateElement,
  homeEntryPanel,
  joinEntryPanel,
  hostEntryPanel,
  onboardingPanel,
  signInPanel,
  setupShell
}) {
  return (
    <>
      {activePlayerRouteRoomCode ? (
        playerRouteMatchesSavedPlayerSession ? (
          playerWaitingShell
        ) : (
          playerJoinElement
        )
      ) : !startupReady ? startupStateElement : null}
      {!activePlayerRouteRoomCode && startupReady && topics.length > 0 && showProductHome && entryRoute === homeRoute ? (
        homeEntryPanel
      ) : null}
      {!activePlayerRouteRoomCode && startupReady && topics.length > 0 && showProductHome && entryRoute === joinRoute ? (
        joinEntryPanel
      ) : null}
      {!activePlayerRouteRoomCode && startupReady && topics.length > 0 && entryRoute === hostRoute && (!roomSession || roomSession.role === 'host') ? (
        hostEntryPanel
      ) : null}
      {!activePlayerRouteRoomCode && startupReady && topics.length > 0 && showProductHome && entryRoute === hostTrialRoute ? (
        onboardingPanel
      ) : null}
      {!activePlayerRouteRoomCode && startupReady && topics.length > 0 && showProductHome && entryRoute === hostSignInRoute ? (
        signInPanel
      ) : null}
      {!activePlayerRouteRoomCode
      && startupReady
      && topics.length > 0
      && roomSession?.role !== 'player'
      && entryRoute !== hostRoute
      && (!showProductHome || entryRoute === startRoute) ? setupShell : null}
    </>
  );
}

export function ActiveGameView({
  appTitle,
  shellEyebrow,
  shellStatus,
  languageControl,
  utilityArea,
  loadingPanel,
  errorPanel,
  gameBoard,
  gameplaySidePanel,
  gameplayActionBar
}) {
  return (
    <AppShell
      mode="game"
      header={(
        <AppHeader
          title={appTitle}
          eyebrow={shellEyebrow}
          status={shellStatus}
          languageControl={languageControl}
          utilityArea={utilityArea}
        />
      )}
      main={(
        <MainStage>
          <>
            {loadingPanel}
            {errorPanel}
            {gameBoard}
          </>
        </MainStage>
      )}
      side={gameplaySidePanel}
      actionBar={gameplayActionBar}
    />
  );
}

export function GameOverView({
  appTitle,
  shellEyebrow,
  shellStatus,
  languageControl,
  utilityArea,
  roundSummary
}) {
  return (
    <AppShell
      mode="game"
      header={(
        <AppHeader
          title={appTitle}
          eyebrow={shellEyebrow}
          status={shellStatus}
          languageControl={languageControl}
          utilityArea={utilityArea}
        />
      )}
      main={(
        <MainStage>
          {roundSummary}
        </MainStage>
      )}
    />
  );
}
