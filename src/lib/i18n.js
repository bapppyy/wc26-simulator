/**
 * Client-side i18n helper for team name localisation.
 * Reads the current language from localStorage (set by AppHeader langSel).
 * Falls back to the English key name if no translation is found.
 */
import { ui, defaultLang } from '../i18n/ui';

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
