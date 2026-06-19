/**
 * Theme preference. Dark is the design lead; light is a clean daytime variant.
 * 'system' follows the OS (no data-theme attribute → the @media query in
 * tokens.css decides). 'light'/'dark' pin it via [data-theme], which wins.
 */
export type ThemePref = 'system' | 'light' | 'dark';

const STORE_KEY = 'pdn.theme';

export function applyTheme(pref: ThemePref): void {
  const el = document.documentElement;
  if (pref === 'system') {
    delete el.dataset.theme;
  } else {
    el.dataset.theme = pref;
  }
}

/** Persisted preference (survives restarts); defaults to the dark lead. */
export function loadTheme(): ThemePref {
  const v = localStorage.getItem(STORE_KEY);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark';
}

export function saveTheme(pref: ThemePref): void {
  localStorage.setItem(STORE_KEY, pref);
}
