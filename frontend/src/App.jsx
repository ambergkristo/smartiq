import { useEffect, useMemo, useState } from 'react';
import { fetchNextCard, fetchTopics } from './api';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Configure a round and start playing.',
  loadingTopics: 'Loading topics...',
  loadError: 'Could not load topics.',
  noTopics: 'No topics available.',
  startRound: 'Start round',
  loadingCard: 'Loading next card...',
  cardError: 'Could not load card for current settings.',
  reveal: 'Reveal / Check',
  pass: 'Pass (keep points)',
  next: 'Next card',
  finish: 'Finish round',
  restart: 'New round',
  passNote: 'Pass keeps current score unchanged.',
  roundSummary: 'Round summary'
};

const DEFAULT_PLAYERS = ['Player 1'];
const DEFAULT_LANGS = ['en', 'et', 'ru'];

function normalizePlayers(raw) {
  const players = raw
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  return players.length > 0 ? players : DEFAULT_PLAYERS;
}

function expectedCorrectIndexes(card) {
  if (Array.isArray(card.correctFlags) && card.correctFlags.length === 10) {
    return new Set(
      card.correctFlags
        .map((flag, idx) => (flag ? idx : null))
        .filter((idx) => idx !== null)
    );
  }

  if (Number.isInteger(card.correctIndex)) {
    return new Set([card.correctIndex]);
  }

  return new Set();
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

function scoreDelta(card, selectedIndexes, passed) {
  if (passed) return 0;
  const expected = expectedCorrectIndexes(card);
  return sameSet(expected, selectedIndexes) ? 1 : 0;
}

function StartScreen({ topics, config, setConfig, onStart }) {
  return (
    <section className="panel">
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

      <button onClick={onStart}>{STRINGS.startRound}</button>
    </section>
  );
}

function ScoreBoard({ players, scores, currentPlayerIndex, cardIndex, roundLength }) {
  return (
    <section className="panel scoreboard">
      <h2>Scoreboard</h2>
      <p>
        Turn: <strong>{players[currentPlayerIndex]}</strong>
      </p>
      <p>
        Card {cardIndex + 1} / {roundLength}
      </p>
      <ul>
        {players.map((player, idx) => (
          <li key={player} className={idx === currentPlayerIndex ? 'active-player' : ''}>
            <span>{player}</span>
            <strong>{scores[player] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CardView({ card, selectedIndexes, toggleIndex, revealed, onReveal, onPass, onNext, isLast }) {
  const correctIndexes = expectedCorrectIndexes(card);

  return (
    <section className="panel">
      <h2>
        {card.topic} · Difficulty {card.difficulty} · {card.language}
      </h2>
      <p className="question">{card.question}</p>
      <p>{STRINGS.passNote}</p>

      <div className="options">
        {card.options.map((option, index) => {
          const selected = selectedIndexes.has(index);
          const correct = revealed && correctIndexes.has(index);
          const wrong = revealed && selected && !correctIndexes.has(index);
          const className = ['option', selected ? 'selected' : '', correct ? 'correct' : '', wrong ? 'wrong' : '']
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${card.id}-${index}`}
              className={className}
              onClick={() => toggleIndex(index)}
              disabled={revealed}
            >
              {index + 1}. {option}
            </button>
          );
        })}
      </div>

      <div className="actions">
        {!revealed ? (
          <>
            <button onClick={onPass}>{STRINGS.pass}</button>
            <button onClick={onReveal}>{STRINGS.reveal}</button>
          </>
        ) : (
          <button onClick={onNext}>{isLast ? STRINGS.finish : STRINGS.next}</button>
        )}
      </div>
    </section>
  );
}

function RoundSummary({ players, scores, roundLength, onRestart }) {
  const sorted = [...players].sort((a, b) => (scores[b] ?? 0) - (scores[a] ?? 0));

  return (
    <section className="panel">
      <h1>{STRINGS.roundSummary}</h1>
      <p>Round length: {roundLength} cards</p>
      <ol>
        {sorted.map((player) => (
          <li key={player}>
            {player}: <strong>{scores[player] ?? 0}</strong>
          </li>
        ))}
      </ol>
      <button onClick={onRestart}>{STRINGS.restart}</button>
    </section>
  );
}

export default function App() {
  const [topics, setTopics] = useState([]);
  const [topicState, setTopicState] = useState('loading');
  const [screen, setScreen] = useState('start');
  const [config, setConfig] = useState({
    topic: '',
    difficulty: '2',
    lang: 'en',
    roundLength: 10,
    playersText: 'Player 1'
  });
  const [players, setPlayers] = useState(DEFAULT_PLAYERS);
  const [scores, setScores] = useState({ 'Player 1': 0 });
  const [cardIndex, setCardIndex] = useState(0);
  const [cardState, setCardState] = useState('idle');
  const [card, setCard] = useState(null);
  const [selectedIndexes, setSelectedIndexes] = useState(new Set());
  const [revealed, setRevealed] = useState(false);
  const [sessionId, setSessionId] = useState('');

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

  const currentPlayerIndex = useMemo(() => {
    if (players.length === 0) return 0;
    return cardIndex % players.length;
  }, [cardIndex, players]);

  const currentPlayer = players[currentPlayerIndex] ?? 'Player 1';

  async function fetchCard(activeSessionId = sessionId) {
    setCardState('loading');
    setRevealed(false);
    setSelectedIndexes(new Set());
    try {
      const data = await fetchNextCard({
        topic: config.topic,
        difficulty: config.difficulty,
        sessionId: activeSessionId,
        lang: config.lang
      });
      setCard(data);
      setCardState('ready');
    } catch (error) {
      console.error(error);
      setCardState('error');
      setCard(null);
    }
  }

  async function startRound() {
    const normalizedPlayers = normalizePlayers(config.playersText);
    const freshSessionId = globalThis.crypto?.randomUUID?.() || `session-${Date.now()}`;
    setSessionId(freshSessionId);
    setPlayers(normalizedPlayers);

    const nextScores = {};
    normalizedPlayers.forEach((player) => {
      nextScores[player] = 0;
    });
    setScores(nextScores);
    setCardIndex(0);
    setScreen('game');
    await fetchCard(freshSessionId);
  }

  function toggleIndex(index) {
    setSelectedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function revealAndScore(passed) {
    if (!card) return;
    const delta = scoreDelta(card, selectedIndexes, passed);
    setScores((prev) => ({
      ...prev,
      [currentPlayer]: (prev[currentPlayer] ?? 0) + delta
    }));
    setRevealed(true);
  }

  async function nextCard() {
    const nextIndex = cardIndex + 1;
    if (nextIndex >= config.roundLength) {
      setScreen('summary');
      return;
    }

    setCardIndex(nextIndex);
    await fetchCard();
  }

  function restart() {
    setScreen('start');
    setCard(null);
    setCardState('idle');
    setSelectedIndexes(new Set());
    setRevealed(false);
  }

  return (
    <main>
      {screen === 'start' ? (
        <>
          {topicState === 'loading' ? <p>{STRINGS.loadingTopics}</p> : null}
          {topicState === 'error' ? <p className="error">{STRINGS.loadError}</p> : null}
          {topicState === 'ready' && topics.length > 0 ? (
            <StartScreen topics={topics} config={config} setConfig={setConfig} onStart={startRound} />
          ) : null}
          {topicState === 'ready' && topics.length === 0 ? <p className="error">{STRINGS.noTopics}</p> : null}
        </>
      ) : null}

      {screen === 'game' ? (
        <>
          <ScoreBoard
            players={players}
            scores={scores}
            currentPlayerIndex={currentPlayerIndex}
            cardIndex={cardIndex}
            roundLength={config.roundLength}
          />

          {cardState === 'loading' ? <p>{STRINGS.loadingCard}</p> : null}
          {cardState === 'error' ? <p className="error">{STRINGS.cardError}</p> : null}
          {cardState === 'ready' && card ? (
            <CardView
              card={card}
              selectedIndexes={selectedIndexes}
              toggleIndex={toggleIndex}
              revealed={revealed}
              onReveal={() => revealAndScore(false)}
              onPass={() => revealAndScore(true)}
              onNext={nextCard}
              isLast={cardIndex + 1 >= config.roundLength}
            />
          ) : null}
        </>
      ) : null}

      {screen === 'summary' ? (
        <RoundSummary players={players} scores={scores} roundLength={config.roundLength} onRestart={restart} />
      ) : null}
    </main>
  );
}
