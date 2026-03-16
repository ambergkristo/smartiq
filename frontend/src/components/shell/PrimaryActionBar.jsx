export default function PrimaryActionBar({ children }) {
  return (
    <footer className="app-shell-actionbar board-surface" data-testid="primary-action-bar">
      {children}
    </footer>
  );
}
