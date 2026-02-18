import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, fetchNextCard, fetchTopics, resolveCardErrorMessage, resolveTopicsErrorState } from './api';
import GameBoard from './components/GameBoard';
import RoundSummary from './components/RoundSummary';
import { expectedCorrectIndexes } from './state/scoring';
import { useGameEngine } from './state/useGameEngine';
import { DEFAULT_LANGS, GamePhase } from './state/types';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Configure players and play Smart10-style rounds.',
  loadingTopics: 'Loading topics...',
  noTopics: 'No topics available.',
  startRound: 'Start game',
  loadingCard: 'Loading round card...',
  retry: 'Retry',
  checkBackendUrl: 'Check backend URL:',
  openHealth: 'Open health',
  passNote: 'Pass keeps points and skips your turn for this round.',
  cardErrorFallback: 'Fallback mode: backend is unavailable right now. Retry to continue.'
};
const SESSION_STORAGE_KEY = 'smartiq.sessionId';
const CONFIG_STORAGE_KEY = 'smartiq.roundConfig';
const RECENT_CARD_LIMIT = 20;
const STARTUP_PHASE = {
  LOADING: 'loading',
  BACKEND_UNREACHABLE: 'backend-unreachable',
  TOPICS_EMPTY: 'topics-empty',
  READY: 'ready'
};

function StartScreen({ topics, config, setConfig, onStart }) {
  const canStart = Boolean(config.topic) && config.playersText.trim().length > 0;

  return (
    <section className="setup-panel board-surface">
      <h1>{STRINGS.title}</h1>
      <p>{STRINGS.subtitle}</p>

      <label htmlFor="topic">Topic</label>
      <select
        id="topic"
        value={config.topic}
        onChange={(event) => setConfig((prev) => ({ ...prev, topic: event.target.value }))}
      >
        {topics.map((topic) => (
          <option key={topic.topic} value={topic.topic}>
            {topic.topic} ({topic.count})
          </option>
        ))}
      </select>

      <label htmlFor="difficulty">Difficulty</label>
      <select
        id="difficulty"
        value={config.difficulty}
        onChange={(event) => setConfig((prev) => ({ ...prev, difficulty: event.target.value }))}
      >
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </select>

      <label htmlFor="lang">Language</label>
      <select
        id="lang"
        value={config.lang}
        onChange={(event) => setConfig((prev) => ({ ...prev, lang: event.target.value }))}
      >
        {DEFAULT_LANGS.map((lang) => (
          <option key={lang} value={lang}>
            {lang}
          </option>
        ))}
      </select>

      <label htmlFor="players">Players (comma separated)</label>
      <input
        id="players"
        type="text"
        value={config.playersText}
        onChange={(event) => setConfig((prev) => ({ ...prev, playersText: event.target.value }))}
        placeholder="Player 1, Player 2"
      />

      <button onClick={onStart} disabled={!canStart} type="button">
        {STRINGS.startRound}
      </button>
    </section>
  );
}

function loadStoredConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      topic: typeof parsed.topic === 'string' ? parsed.topic : '',
      difficulty: ['1', '2', '3'].includes(String(parsed.difficulty)) ? String(parsed.difficulty) : '2',
      lang: DEFAULT_LANGS.includes(parsed.lang) ? parsed.lang : 'en',
      playersText: typeof parsed.playersText === 'string' && parsed.playersText.trim() ? parsed.playersText : 'Player 1'
    };
  } catch {
    return null;
  }
}

function StartupStatePanel({ startup, onRetry }) {
  if (startup.phase === STARTUP_PHASE.READY) {
    return null;
  }

  if (startup.phase === STARTUP_PHASE.LOADING) {
    return (
      <section className="setup-panel board-surface startup-panel">
        <h1>{STRINGS.title}</h1>
        <p>{STRINGS.loadingTopics}</p>
      </section>
    );
  }

  if (startup.phase === STARTUP_PHASE.TOPICS_EMPTY) {
    return (
      <section className="setup-panel board-surface startup-panel">
        <h1>{STRINGS.title}</h1>
        <p className="error">{STRINGS.noTopics}</p>
        <button type="button" onClick={onRetry}>
          {STRINGS.retry}
        </button>
      </section>
    );
  }

  return (
    <section className="setup-panel board-surface startup-panel">
      <h1>{STRINGS.title}</h1>
      <div className="error-panel">
        <p className="error">{startup.error?.title ?? 'Could not load topics.'}</p>
        <p>{startup.error?.detail}</p>
      </div>
      <button type="button" onClick={onRetry}>
        {STRINGS.retry}
      </button>
      <p className="startup-hint">
        {STRINGS.checkBackendUrl} <code>{API_BASE}</code>
      </p>
      <a className="inline-link" href={`${API_BASE}/health`} target="_blank" rel="noreferrer">
        {STRINGS.openHealth}
      </a>
    </section>
  );
}

export default function App() {
  const storedConfig = loadStoredConfig();
  const [topics, setTopics] = useState([]);
  const [startup, setStartup] = useState({
    phase: STARTUP_PHASE.LOADING,
    error: null
  });
  const [config, setConfig] = useState({
    topic: storedConfig?.topic ?? '',
    difficulty: storedConfig?.difficulty ?? '2',
    lang: storedConfig?.lang ?? 'en',
    playersText: storedConfig?.playersText ?? 'Player 1'
  });
  const [sessionId, setSessionId] = useState('');
  const [cardError, setCardError] = useState('');
  const recentCardIdsRef = useRef([]);

  const engine = useGameEngine(30);
  const { phase, loadTicket, cardLoaded, cardLoadFailed } = engine;

  const loadTopics = useCallback(async () => {
    setStartup({
      phase: STARTUP_PHASE.LOADING,
      error: null
    });

    try {
      const data = await fetchTopics();
      setTopics(data);
      if (data.length > 0) {
        setStartup({
          phase: STARTUP_PHASE.READY,
          error: null
        });
        setConfig((prev) => {
          const topicExists = data.some((entry) => entry.topic === prev.topic);
          return { ...prev, topic: topicExists ? prev.topic : data[0].topic };
        });
        return;
      }

      setStartup({
        phase: STARTUP_PHASE.TOPICS_EMPTY,
        error: null
      });
    } catch (error) {
      console.error(error);
      setStartup({
        phase: STARTUP_PHASE.BACKEND_UNREACHABLE,
        error: resolveTopicsErrorState(error)
      });
    }
  }, []);

  useEffect(() => {
    loadTopics();

    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      setSessionId(savedSession);
    }
  }, [loadTopics]);

  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    async function loadCard() {
      if (phase !== GamePhase.LOADING_CARD) return;
      if (!sessionId) return;

      try {
        setCardError('');
        let card = await fetchNextCard({
          topic: config.topic,
          difficulty: config.difficulty,
          sessionId,
          lang: config.lang
        });
        let attempts = 0;
        while (recentCardIdsRef.current.includes(card.id) && attempts < 2) {
          card = await fetchNextCard({
            topic: config.topic,
            difficulty: config.difficulty,
            sessionId,
            lang: config.lang
          });
          attempts += 1;
        }
        recentCardIdsRef.current = [card.id, ...recentCardIdsRef.current].slice(0, RECENT_CARD_LIMIT);
        cardLoaded(card);
      } catch (error) {
        console.error(error);
        setCardError(resolveCardErrorMessage(error) || STRINGS.cardErrorFallback);
        cardLoadFailed();
      }
    }

    loadCard();
  }, [loadTicket, cardLoaded, cardLoadFailed, phase, sessionId, config.topic, config.difficulty, config.lang]);

  function handleStartRound() {
    const freshSessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    setSessionId(freshSessionId);
    localStorage.setItem(SESSION_STORAGE_KEY, freshSessionId);
    recentCardIdsRef.current = [];
    engine.startRound(config.playersText);
  }

  function handleRestart() {
    engine.resetToSetup();
    setCardError('');
  }

  return (
    <main>
      {engine.phase === GamePhase.SETUP ? (
        <>
          {startup.phase !== STARTUP_PHASE.READY ? <StartupStatePanel startup={startup} onRetry={loadTopics} /> : null}
          {startup.phase === STARTUP_PHASE.READY && topics.length > 0 ? (
            <StartScreen topics={topics} config={config} setConfig={setConfig} onStart={handleStartRound} />
          ) : null}
        </>
      ) : null}

      {engine.phase !== GamePhase.SETUP && engine.phase !== GamePhase.ROUND_SUMMARY && engine.phase !== GamePhase.GAME_OVER ? (
        <>
          {engine.phase === GamePhase.LOADING_CARD ? <p>{STRINGS.loadingCard}</p> : null}
          {cardError ? (
            <div className="error-panel">
              <p className="error">{cardError}</p>
              <button type="button" onClick={engine.beginCardLoad}>
                {STRINGS.retry}
              </button>
            </div>
          ) : null}
          {engine.card ? (
            <GameBoard
              card={engine.card}
              selectedIndexes={engine.selectedIndexes}
              revealedIndexes={engine.revealedIndexes}
              wrongIndexes={engine.wrongIndexes}
              toggleIndex={engine.toggleOption}
              phase={engine.phase}
              onAnswer={engine.requestConfirm}
              onConfirm={engine.confirmAnswer}
              onCancelConfirm={engine.cancelConfirm}
              onPass={engine.passTurn}
              onNext={engine.nextStep}
              players={engine.players}
              scores={engine.scores}
              currentPlayerIndex={engine.currentPlayerIndex}
              roundNumber={engine.roundNumber}
              passNote={STRINGS.passNote}
              lastAction={engine.lastAction}
              currentPlayer={engine.currentPlayer}
              targetScore={engine.targetScore}
              eliminatedPlayers={engine.eliminatedPlayers}
              passedPlayers={engine.passedPlayers}
              correctIndexes={expectedCorrectIndexes(engine.card)}
            />
          ) : null}
        </>
      ) : null}

      {engine.phase === GamePhase.ROUND_SUMMARY || engine.phase === GamePhase.GAME_OVER ? (
        <RoundSummary
          players={engine.players}
          scores={engine.scores}
          roundNumber={engine.roundNumber}
          onNextRound={engine.nextStep}
          onRestart={handleRestart}
          winner={engine.winner}
        />
      ) : null}
    </main>
  );
}
