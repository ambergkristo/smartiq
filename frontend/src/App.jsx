import { useEffect, useMemo, useState } from 'react';
import { fetchRandomCard, fetchTopics } from './api';

const STRINGS = {
  title: 'SmartIQ',
  subtitle: 'Pick a topic and play one trivia round',
  loadingTopics: 'Loading topics...',
  loadError: 'Could not load topics.',
  selectTopic: 'Select a topic',
  randomTopic: 'Random (any topic)',
  startRound: 'Start round',
  loadingCard: 'Loading question card...',
  noCard: 'No card found for this topic.',
  answerPrompt: 'Choose your answer',
  nextRound: 'Next question',
  back: 'Back to topics'
};

function StartScreen({ topics, selectedTopic, setSelectedTopic, onStart }) {
  return (
    <section className="panel">
      <h1>{STRINGS.title}</h1>
      <p>{STRINGS.subtitle}</p>
      <label htmlFor="topic-select">{STRINGS.selectTopic}</label>
      <select
        id="topic-select"
        value={selectedTopic}
        onChange={(event) => setSelectedTopic(event.target.value)}
      >
        <option value="">{STRINGS.randomTopic}</option>
        {topics.map((topic) => (
          <option key={topic.topic} value={topic.topic}>
            {topic.topic} ({topic.count})
          </option>
        ))}
      </select>
      <button onClick={onStart}> {STRINGS.startRound} </button>
    </section>
  );
}

function RoundScreen({ card, selectedAnswer, setSelectedAnswer, onNext, onBack }) {
  const isAnswered = selectedAnswer !== null;
  const isCorrect = isAnswered && selectedAnswer === card.correctIndex;

  return (
    <section className="panel">
      <h2>{card.topic}</h2>
      <p className="question">{card.question}</p>
      <p>{STRINGS.answerPrompt}</p>
      <div className="options">
        {card.options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const className = [
            'option',
            isSelected ? 'selected' : '',
            isAnswered && index === card.correctIndex ? 'correct' : '',
            isAnswered && isSelected && index !== card.correctIndex ? 'wrong' : ''
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <button
              key={`${card.id}-${index}`}
              className={className}
              disabled={isAnswered}
              onClick={() => setSelectedAnswer(index)}
            >
              {index + 1}. {option}
            </button>
          );
        })}
      </div>
      {isAnswered ? (
        <p className={`result ${isCorrect ? 'ok' : 'fail'}`}>
          {isCorrect ? 'Correct!' : `Incorrect. Correct answer: ${card.options[card.correctIndex]}`}
        </p>
      ) : null}
      <div className="actions">
        <button onClick={onBack}>{STRINGS.back}</button>
        <button onClick={onNext}>{STRINGS.nextRound}</button>
      </div>
    </section>
  );
}

export default function App() {
  const [topics, setTopics] = useState([]);
  const [topicState, setTopicState] = useState('loading');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [screen, setScreen] = useState('start');
  const [cardState, setCardState] = useState('idle');
  const [card, setCard] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);

  useEffect(() => {
    async function loadTopics() {
      try {
        const data = await fetchTopics();
        setTopics(data);
        setTopicState('ready');
      } catch (error) {
        console.error(error);
        setTopicState('error');
      }
    }

    loadTopics();
  }, []);

  const canStart = useMemo(() => topicState === 'ready' && topics.length > 0, [topicState, topics]);

  async function loadRound() {
    setScreen('round');
    setCardState('loading');
    setSelectedAnswer(null);
    try {
      const data = await fetchRandomCard(selectedTopic || undefined);
      setCard(data);
      setCardState('ready');
    } catch (error) {
      console.error(error);
      setCardState('error');
      setCard(null);
    }
  }

  return (
    <main>
      {screen === 'start' ? (
        <>
          {topicState === 'loading' ? <p>{STRINGS.loadingTopics}</p> : null}
          {topicState === 'error' ? <p className="error">{STRINGS.loadError}</p> : null}
          {topicState === 'ready' ? (
            <StartScreen
              topics={topics}
              selectedTopic={selectedTopic}
              setSelectedTopic={setSelectedTopic}
              onStart={loadRound}
            />
          ) : null}
        </>
      ) : null}

      {screen === 'round' ? (
        <>
          {cardState === 'loading' ? <p>{STRINGS.loadingCard}</p> : null}
          {cardState === 'error' ? <p className="error">{STRINGS.noCard}</p> : null}
          {cardState === 'ready' && card ? (
            <RoundScreen
              card={card}
              selectedAnswer={selectedAnswer}
              setSelectedAnswer={setSelectedAnswer}
              onNext={loadRound}
              onBack={() => setScreen('start')}
            />
          ) : null}
        </>
      ) : null}

      {!canStart && topicState === 'ready' ? <p className="error">No topics available.</p> : null}
    </main>
  );
}