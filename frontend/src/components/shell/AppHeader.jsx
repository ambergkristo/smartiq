import CherryPickLogo, { isCherryPickBrand } from '../branding/CherryPickLogo';

export default function AppHeader({
  title,
  eyebrow,
  status,
  languageControl,
  utilityArea
}) {
  return (
    <header className="app-header board-surface">
      <div className="app-header-copy">
        {eyebrow ? <p className="app-header-eyebrow">{eyebrow}</p> : null}
        <div className="app-header-title-row">
          <h1 className={isCherryPickBrand(title) ? 'app-header-brand-heading' : ''}>
            {isCherryPickBrand(title) ? <CherryPickLogo size="header" /> : title}
          </h1>
          {status ? <span className="app-header-status">{status}</span> : null}
        </div>
      </div>
      <div className="app-header-controls">
        {languageControl ? (
          <div className="app-header-control-group app-header-control-group--language">
            <span className="app-header-label">Language</span>
            {languageControl}
          </div>
        ) : null}
        {utilityArea ? (
          <div className="app-header-control-group app-header-control-group--utility">
            <span className="app-header-label">Sound / Settings</span>
            {utilityArea}
          </div>
        ) : null}
      </div>
    </header>
  );
}
