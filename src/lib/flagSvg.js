/**
 * Round flag helper using the Circle Flags open-source CDN.
 * Falls back to the emoji flag for any team without an ISO-3166-1 mapping.
 * CDN: https://kapowaz.github.io/circle-flags/flags/<iso>.svg
 */

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
  'Czechia':        'CZ',
  'DR Congo':       'CD',
  'Ecuador':        'EC',
  'Egypt':          'EG',
  'England':        'gb-eng',
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
  'Scotland':       'gb-sct',
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
const CDN = 'https://kapowaz.github.io/circle-flags/flags';

export function flagHtml(name, emoji = '🏴') {
  const iso = TEAM_ISO[name];
  if (!iso) {
    return `<span class="flag-em" role="img" aria-label="${name}">${emoji}</span>`;
  }
  return `<img src="${CDN}/${iso.toLowerCase()}.svg" alt="${name}" class="flag-ci" loading="lazy" />`;
}
