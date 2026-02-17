import { useEffect, useState } from 'react';
import { fetchNextCard, fetchTopics } from './api';
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
  passNote: 'Pass keeps current score unchanged.'
};

function StartScreen({ topics, config, setConfig, onStart }) {
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

      <button onClick={onStart} type="button">
        {STRINGS.startRound}
      </button>
    </section>
  );
}

export default function App() {
  const [topics, setTopics] = useState([]);
  const [topicState, setTopicState] = useState('loading');
  const [config, setConfig] = useState({
    topic: '',
    difficulty: '2',
    lang: 'en',
    roundLength: 10,
    playersText: 'Player 1'
  });
  const [sessionId, setSessionId] = useState('');
  const [cardError, setCardError] = useState('');

  const engine = useGameEngine(config.roundLength);
  const { phase, cardLoaded, cardLoadFailed } = engine;

  useEffect(() => {
    async function loadTopics() {
      try {
        const data = await fetchTopics();
        setTopics(data);
        setTopicState('ready');
        if (data.length > 0) {
          setConfig((prev) => ({ ...prev, topic: prev.topic || data[0].topic }));
        }
      } catch (error) {
        console.error(error);
        setTopicState('error');
      }
    }

    loadTopics();
  }, []);

  useEffect(() => {
    async function loadCard() {
      if (phase !== GamePhase.LOADING_CARD) return;
      if (!sessionId) return;

      try {
        setCardError('');
        const card = await fetchNextCard({
          topic: config.topic,
          difficulty: config.difficulty,
          sessionId,
          lang: config.lang
        });
        cardLoaded(card);
      } catch (error) {
        console.error(error);
        setCardError(STRINGS.cardError);
        cardLoadFailed();
      }
    }

    loadCard();
  }, [
    phase,
    cardLoaded,
    cardLoadFailed,
    sessionId,
    config.topic,
    config.difficulty,
    config.lang
  ]);

  function handleStartRound() {
    const freshSessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    setSessionId(freshSessionId);
    engine.startRound(config.playersText);
  }

  function handleNext() {
    const result = engine.nextStep();
    if (!result.done) {
      engine.beginCardLoad();
    }
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
          {cardError ? <p className="error">{cardError}</p> : null}
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
