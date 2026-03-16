import QuestionCard from './QuestionCard';

export default function QuestionPrompt({
  question,
  roundIndicator,
  isLongQuestion,
  questionExpanded,
  onToggle
}) {
  return (
    <div className="question-prompt" data-testid="question-prompt">
      <QuestionCard
        question={question}
        roundIndicator={roundIndicator}
        isLongQuestion={isLongQuestion}
        questionExpanded={questionExpanded}
        onToggle={onToggle}
      />
    </div>
  );
}
