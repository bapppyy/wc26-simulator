/**
 * Round SVG flag helper using the 'country-flag-icons' package.
 * Falls back to the emoji flag for any team without an ISO-3166-1 mapping.
 */
import * as svgFlags from 'country-flag-icons/string/3x2';

/** Map team names (as used in data.js) to ISO 3166-1 alpha-2 codes. */
export const TEAM_ISO = {
  'Argentina':      'AR',
  'Australia':      'AU',
  'Algeria':        'DZ',
  'Austria':        'AT',
  'Belgium':        'BE',
  'Bosnia-Herz.':   'BA',
  'Brazil':         'BR',
  'Canada':         'CA',
  'Cape Verde':     'CV',
  'Colombia':       'CO',
  'Croatia':        'HR',
  'Curaçao':        'CW',
  'Czech Republic': 'CZ',
  'DR Congo':       'CD',
  'Ecuador':        'EC',
  'Egypt':          'EG',
  'England':        'GB',   // ISO 3166-1 has no GB-ENG
  'France':         'FR',
  'Germany':        'DE',
  'Ghana':          'GH',
  'Haiti':          'HT',
  'Iran':           'IR',
  'Iraq':           'IQ',
  'Ivory Coast':    'CI',
  'Japan':          'JP',
  'Jordan':         'JO',
  'Mexico':         'MX',
  'Morocco':        'MA',
  'Netherlands':    'NL',
  'New Zealand':    'NZ',
  'Norway':         'NO',
  'Panama':         'PA',
  'Paraguay':       'PY',
  'Portugal':       'PT',
  'Qatar':          'QA',
  'Saudi Arabia':   'SA',
  'Scotland':       'GB',   // ISO 3166-1 has no GB-SCT
  'Senegal':        'SN',
  'South Africa':   'ZA',
  'South Korea':    'KR',
  'Spain':          'ES',
  'Sweden':         'SE',
  'Switzerland':    'CH',
  'Tunisia':        'TN',
  'Turkey':         'TR',
  'Uruguay':        'UY',
  'USA':            'US',
  'Uzbekistan':     'UZ',
};

/**
 * Returns HTML for a round SVG flag (20 × 20 px, clipped to circle).
 * @param {string} name  Team name as stored in data.js
 * @param {string} emoji Fallback emoji flag (DATA[name].f)
 */
export function flagHtml(name, emoji = '🏴') {
  const iso = TEAM_ISO[name];
  const svg = iso ? svgFlags[iso] : null;
  if (!svg) {
    return `<span class="flag-em" role="img" aria-label="${name}">${emoji}</span>`;
  }
  return `<span class="flag-svg" role="img" aria-label="${name}" title="${name}">${svg}</span>`;
}
