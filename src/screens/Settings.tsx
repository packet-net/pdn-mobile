import type { ThemePref } from '../theme';

/**
 * Settings — app-level preferences (plan §2). P0 ships appearance + an about
 * block; account/identity and notification controls layer on as those subsystems
 * land. Kept to plain, recognisable controls — appearance is something you set,
 * not "theme engine configuration".
 */
const THEME_OPTIONS: { value: ThemePref; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function Settings({
  theme,
  onTheme,
}: {
  theme: ThemePref;
  onTheme: (t: ThemePref) => void;
}) {
  return (
    <div className="screen">
      <header className="screen__head">
        <p className="eyebrow">Preferences</p>
        <h1 className="screen__title">Settings</h1>
      </header>

      <p className="section-label">Appearance</p>
      <div className="card">
        <div className="setting-row">
          <span className="setting-row__label">Theme</span>
          <div className="seg" role="radiogroup" aria-label="Theme">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={theme === opt.value}
                className={`seg__opt${theme === opt.value ? ' is-on' : ''}`}
                onClick={() => onTheme(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="section-label">About</p>
      <div className="card">
        <div className="setting-row">
          <span className="setting-row__label">App</span>
          <span className="setting-row__value mono">pdn-mobile</span>
        </div>
        <div className="setting-row">
          <span className="setting-row__label">Version</span>
          <span className="setting-row__value mono">0.0.0 · preview</span>
        </div>
        <div className="setting-row">
          <span className="setting-row__label">Ecosystem</span>
          <span className="setting-row__value">packet.net</span>
        </div>
      </div>

      <p className="settings-foot muted">
        A companion for your packet nodes — BBS, chat and WhatsPac surfaces are on
        the way.
      </p>
    </div>
  );
}
