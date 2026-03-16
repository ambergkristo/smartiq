import { render, screen } from '@testing-library/react';
import CherryRoundIndicator from './CherryRoundIndicator';

describe('CherryRoundIndicator', () => {
  test('renders Double Cherry with multiplier badge', () => {
    render(<CherryRoundIndicator type="double-cherry" label="Double Cherry" multiplierLabel="XP x3" />);

    expect(screen.getByTestId('question-card-round-indicator')).toHaveAttribute('data-variant', 'double-cherry');
    expect(screen.getByTestId('question-card-round-indicator')).toHaveTextContent('Double Cherry');
    expect(screen.getByTestId('question-card-round-indicator')).toHaveTextContent('XP x3');
  });

  test('supports future Golden Cherry styling without gameplay wiring', () => {
    render(<CherryRoundIndicator type="golden-cherry" label="Golden Cherry" />);

    expect(screen.getByTestId('question-card-round-indicator')).toHaveAttribute('data-variant', 'golden-cherry');
    expect(screen.getByTestId('question-card-round-indicator')).toHaveTextContent('Golden Cherry');
  });

  test('renders nothing for normal rounds', () => {
    const { container } = render(<CherryRoundIndicator type="normal" label="Normal round" multiplierLabel="XP x1" />);

    expect(container).toBeEmptyDOMElement();
  });
});
