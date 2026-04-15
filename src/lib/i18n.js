/**
 * Client-side i18n helpers for team name and UI string localisation.
 * Reads the current language from localStorage (set by AppHeader langSel).
 * Falls back to the English key name if no translation is found.
 */
import { ui, defaultLang, t as _t } from '../i18n/ui';

/**
 * Returns the localised string for a UI key.
 * @param {string} key  Translation key from ui.ts (e.g. 'round.r32')
 * @returns {string}    Localised string
 */
export function t(key) {
  try {
    const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('wc26_lang')) || defaultLang;
    return _t(key, lang);
  } catch (e) {
    return key;
  }
}

/**
 * Returns the localised display name for a team.
 * Internal keys (DATA lookups, state, onclick handlers) must always use
 * the English name — only call tTeam() for display/render.
 *
 * @param {string} name  English team name as stored in data.js
 * @returns {string}     Localised team name
 */
export function tTeam(name) {
  try {
    const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('wc26_lang')) || defaultLang;
    const dict = (ui[lang] || ui[defaultLang]);
    const key = 'team.' + name;
    return dict[key] || (ui[defaultLang])[key] || name;
  } catch (e) {
    return name;
  }
}
