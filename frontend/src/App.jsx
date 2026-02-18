import { useEffect, useRef, useState } from 'react';
import { fetchNextCard, fetchTopics, resolveCardErrorMessage } from './api';
import GameBoard from './components/GameBoard';
import RoundSummary from './components/RoundSummary';
import { expectedCorrectIndexes } from './state/scoring';
import { useGameEngine } from './state/useGameEngine';
import { DEFAULT_LANGS, GamePhase } from './state/types';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Configure a round and start playing.',
  loadingTopics: 'Loading topics...',
  loadError: 'Could not load topics.',
  noTopics: 'No topics available.',
  startRound: 'Start round',
  loadingCard: 'Loading next card...',
  cardError: 'Could not load card for current settings.',
  retry: 'Retry',
  passNote: 'Pass keeps current score unchanged.'
};
const SESSION_STORAGE_KEY = 'smartiq.sessionId';
const CONFIG_STORAGE_KEY = 'smartiq.roundConfig';
const RECENT_CARD_LIMIT = 20;

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

      <label htmlFor="roundLength">Cards in round</label>
      <select
        id="roundLength"
        value={config.roundLength}
        onChange={(event) => setConfig((prev) => ({ ...prev, roundLength: Number(event.target.value) }))}
      >
        <option value="5">5</option>
        <option value="10">10</option>
        <option value="15">15</option>
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
      roundLength: [5, 10, 15].includes(Number(parsed.roundLength)) ? Number(parsed.roundLength) : 10,
      playersText: typeof parsed.playersText === 'string' && parsed.playersText.trim() ? parsed.playersText : 'Player 1'
    };
  } catch {
    return null;
  }
}

export default function App() {
  const storedConfig = loadStoredConfig();
  const [topics, setTopics] = useState([]);
  const [topicState, setTopicState] = useState('loading');
  const [config, setConfig] = useState({
    topic: storedConfig?.topic ?? '',
    difficulty: storedConfig?.difficulty ?? '2',
    lang: storedConfig?.lang ?? 'en',
    roundLength: storedConfig?.roundLength ?? 10,
    playersText: storedConfig?.playersText ?? 'Player 1'
  });
  const [sessionId, setSessionId] = useState('');
  const [cardError, setCardError] = useState('');
  const recentCardIdsRef = useRef([]);

  const engine = useGameEngine(config.roundLength);
  const { phase, loadTicket, cardLoaded, cardLoadFailed } = engine;

  useEffect(() => {
    async function loadTopics() {
      try {
        const data = await fetchTopics();
        setTopics(data);
        setTopicState('ready');
        if (data.length > 0) {
          setConfig((prev) => {
            const topicExists = data.some((entry) => entry.topic === prev.topic);
            return { ...prev, topic: topicExists ? prev.topic : data[0].topic };
          });
        }
      } catch (error) {
        console.error(error);
        setTopicState('error');
      }
    }

    loadTopics();

    const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
    if (savedSession) {
      setSessionId(savedSession);
    }
  }, []);

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
        setCardError(resolveCardErrorMessage(error));
        cardLoadFailed();
      }
    }

    loadCard();
  }, [
    loadTicket,
    cardLoaded,
    cardLoadFailed,
    phase,
    sessionId,
    config.topic,
    config.difficulty,
    config.lang
  ]);

  function handleStartRound() {
    const freshSessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    setSessionId(freshSessionId);
    localStorage.setItem(SESSION_STORAGE_KEY, freshSessionId);
    recentCardIdsRef.current = [];
    engine.startRound(config.playersText);
  }

  function handleNext() {
    engine.nextStep();
  }

  function handleRestart() {
    engine.resetToSetup();
    setCardError('');
  }

  return (
    <main>
      {engine.phase === GamePhase.SETUP ? (
        <>
          {topicState === 'loading' ? <p>{STRINGS.loadingTopics}</p> : null}
          {topicState === 'error' ? <p className="error">{STRINGS.loadError}</p> : null}
          {topicState === 'ready' && topics.length > 0 ? (
            <StartScreen topics={topics} config={config} setConfig={setConfig} onStart={handleStartRound} />
          ) : null}
          {topicState === 'ready' && topics.length === 0 ? <p className="error">{STRINGS.noTopics}</p> : null}
        </>
      ) : null}

      {engine.phase !== GamePhase.SETUP && engine.phase !== GamePhase.ROUND_SUMMARY ? (
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
              toggleIndex={engine.toggleOption}
              phase={engine.phase}
              onAnswer={engine.requestConfirm}
              onConfirm={engine.confirmAnswer}
              onCancelConfirm={engine.cancelConfirm}
              onPass={engine.passTurn}
              onNext={handleNext}
              isLast={engine.cardIndex + 1 >= config.roundLength}
              players={engine.players}
              scores={engine.scores}
              currentPlayerIndex={engine.currentPlayerIndex}
              cardIndex={engine.cardIndex}
              roundLength={config.roundLength}
              passNote={STRINGS.passNote}
              lastAction={engine.lastAction}
              currentPlayer={engine.currentPlayer}
              correctIndexes={expectedCorrectIndexes(engine.card)}
            />
          ) : null}
        </>
      ) : null}

      {engine.phase === GamePhase.ROUND_SUMMARY ? (
        <RoundSummary
          players={engine.players}
          scores={engine.scores}
          roundLength={config.roundLength}
          onRestart={handleRestart}
        />
      ) : null}
    </main>
  );
}

