import { render, screen } from '@testing-library/react';
import CherryPickLogo from './CherryPickLogo';

describe('CherryPickLogo', () => {
  test('renders the official CherryPick wordmark and twin-cherry icon', () => {
    const { container } = render(<CherryPickLogo size="hero" />);

    expect(screen.getByText('CherryPick')).toBeInTheDocument();
    expect(container.querySelector('.cherrypick-logo--hero')).not.toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
