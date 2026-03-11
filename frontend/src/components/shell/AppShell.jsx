export default function AppShell({ header, main, side = null, actionBar = null, mode = 'setup' }) {
  const bodyClassName = side
    ? 'app-shell-body'
    : 'app-shell-body app-shell-body--single';

  return (
    <div className={`app-shell app-shell--${mode}`}>
      {header}
      <div className={bodyClassName}>
        {main}
        {side}
      </div>
      {actionBar}
    </div>
  );
}
