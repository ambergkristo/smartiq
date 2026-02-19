import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE, fetchNextCard, fetchTopics, resolveCardErrorMessage, resolveTopicsErrorState } from './api';
import GameBoard from './components/GameBoard';
import RoundSummary from './components/RoundSummary';
import { expectedCorrectIndexes } from './state/scoring';
import { useGameEngine } from './state/useGameEngine';
import { DEFAULT_LANGS, GamePhase } from './state/types';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Pick a topic, set difficulty, and start a premium Smart10-style round.',
  loadingTopics: 'Loading topics...',
  noTopics: 'No topics yet.',
  noTopicsHint: 'Import clean cards to populate topics and retry.',
  startRound: 'Start game',
  loadingCard: 'Loading round card...',
  retry: 'Retry',
  checkBackendUrl: 'Check backend URL:',
  openHealth: 'Open health',
  passNote: 'Pass keeps points and skips your turn for this round.',
  cardErrorFallback: 'Could not load card from backend. Retry to continue.',
  playersPlaceholder: 'Type player names and press Enter (or comma)',
  addPlayerHint: 'At least one player is required.'
};
const SESSION_STORAGE_KEY = 'smartiq.sessionId';
const CONFIG_STORAGE_KEY = 'smartiq.roundConfig';
const RECENT_CARD_LIMIT = 20;
const STARTUP_PHASE = {
  LOADING: 'loading',
  BACKEND_UNREACHABLE: 'backend-unreachable',
  FORBIDDEN: 'forbidden',
  SERVER_ERROR: 'server-error',
  NOT_FOUND: 'not-found',
  TOPICS_EMPTY: 'topics-empty',
  READY: 'ready'
};

const DIFFICULTY_OPTIONS = [
  { value: '1', label: 'Easy' },
  { value: '2', label: 'Medium' },
  { value: '3', label: 'Hard' }
];

function normalizePlayerName(name) {
  return name.replace(/\s+/g, ' ').trim();
}

function parsePlayers(text) {
  return Array.from(
    new Set(
      text
        .split(',')
        .map(normalizePlayerName)
        .filter(Boolean)
    )
  );
}

function SetupSkeleton() {
  return (
    <section className="setup-panel board-surface" data-testid="setup-skeleton">
      <h1>{STRINGS.title}</h1>
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

function StartScreen({ topics, config, setConfig, onStart }) {
  const players = parsePlayers(config.playersText);
  const canStart = Boolean(config.topic) && players.length > 0;

  function addPlayers(rawValue) {
    const incoming = parsePlayers(rawValue);
    if (incoming.length === 0) {
      return;
    }
    const merged = Array.from(new Set([...players, ...incoming]));
    setConfig((prev) => ({ ...prev, playersText: merged.join(', ') }));
  }

  function removePlayer(player) {
    const next = players.filter((entry) => entry !== player);
    setConfig((prev) => ({ ...prev, playersText: next.join(', ') }));
  }

  return (
    <section className="setup-panel board-surface">
      <h1>{STRINGS.title}</h1>
      <p>{STRINGS.subtitle}</p>

      <div className="setup-toolbar">
        <label htmlFor="lang">Language</label>
        <select
          id="lang"
          value={config.lang}
          onChange={(event) => setConfig((prev) => ({ ...prev, lang: event.target.value }))}
        >
          {DEFAULT_LANGS.map((lang) => (
            <option key={lang} value={lang}>
              {lang.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      <h2 className="section-title">Topic</h2>
      <div className="topic-grid" role="radiogroup" aria-label="Topic options">
        {topics.map((topic) => {
          const selected = config.topic === topic.topic;
          return (
            <button
              key={topic.topic}
              type="button"
              className={`topic-tile${selected ? ' selected' : ''}`}
              onClick={() => setConfig((prev) => ({ ...prev, topic: topic.topic }))}
              aria-pressed={selected}
            >
              <span className="topic-title">{topic.topic}</span>
              <span className="topic-count">{topic.count} Q</span>
            </button>
          );
        })}
      </div>

      <h2 className="section-title">Difficulty</h2>
      <div className="difficulty-pills" role="radiogroup" aria-label="Difficulty">
        {DIFFICULTY_OPTIONS.map((entry) => {
          const selected = config.difficulty === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              className={`pill${selected ? ' selected' : ''}`}
              onClick={() => setConfig((prev) => ({ ...prev, difficulty: entry.value }))}
              aria-pressed={selected}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      <label htmlFor="players">Players</label>
      <input
        id="players"
        type="text"
        defaultValue=""
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ',') {
            event.preventDefault();
            addPlayers(event.currentTarget.value);
            event.currentTarget.value = '';
          }
        }}
        onBlur={(event) => {
          addPlayers(event.currentTarget.value);
          event.currentTarget.value = '';
        }}
        placeholder={STRINGS.playersPlaceholder}
      />
      <div className="players-chips">
        {players.map((player) => (
          <button key={player} className="player-token" type="button" onClick={() => removePlayer(player)}>
            <span>{player}</span>
            <span aria-hidden>×</span>
          </button>
        ))}
      </div>
      {players.length === 0 ? <p className="field-hint">{STRINGS.addPlayerHint}</p> : null}

      <button className="start-cta" onClick={onStart} disabled={!canStart} type="button">
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
      playersText: typeof parsed.playersText === 'string' ? parsed.playersText : ''
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
    return <SetupSkeleton />;
  }

  if (startup.phase === STARTUP_PHASE.TOPICS_EMPTY) {
    return (
      <section className="setup-panel board-surface startup-panel">
        <h1>{STRINGS.title}</h1>
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
      <h1>{STRINGS.title}</h1>
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
    playersText: storedConfig?.playersText ?? ''
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
      const resolved = resolveTopicsErrorState(error);
      setStartup({
        phase:
          resolved.kind === 'forbidden'
            ? STARTUP_PHASE.FORBIDDEN
            : resolved.kind === 'server-error'
              ? STARTUP_PHASE.SERVER_ERROR
              : resolved.kind === 'not-found'
                ? STARTUP_PHASE.NOT_FOUND
              : STARTUP_PHASE.BACKEND_UNREACHABLE,
        error: resolved
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
        setCardError(resolveCardErrorMessage(error) || STRINGS.cardErrorFallback);
        cardLoadFailed();
      }
    }

    loadCard();
  }, [loadTicket, cardLoaded, cardLoadFailed, phase, sessionId, config.topic, config.difficulty, config.lang]);

  function handleStartRound() {
    const freshSessionId = createFreshSession();
    recentCardIdsRef.current = [];
    engine.startRound(config.playersText);
    return freshSessionId;
  }

  function createFreshSession() {
    const freshSessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    setSessionId(freshSessionId);
    localStorage.setItem(SESSION_STORAGE_KEY, freshSessionId);
    return freshSessionId;
  }

  function handlePlayAgain() {
    createFreshSession();
    recentCardIdsRef.current = [];
    engine.startRound(config.playersText);
  }

  function handleRestart() {
    engine.resetToSetup();
    setCardError('');
  }

  return (
    <main data-phase={engine.phase === GamePhase.SETUP ? 'setup' : 'game'}>
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
          {engine.phase === GamePhase.LOADING_CARD ? (
            <section className="board-surface card-loading-panel" data-testid="card-loading-panel">
              <p>{STRINGS.loadingCard}</p>
              <div className="card-loading-skeleton" aria-hidden />
            </section>
          ) : null}
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
          stats={engine.stats}
          roundNumber={engine.roundNumber}
          onNextRound={engine.nextStep}
          onRestart={handleRestart}
          onPlayAgain={handlePlayAgain}
          winner={engine.winner}
        />
      ) : null}
    </main>
  );
}
