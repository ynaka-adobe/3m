/**
 * consent.js — bridges 3M's Securiti.ai consent platform into the site.
 *
 * The consent banner and "3M Cookie Preference Center" are 3M's own, served by
 * Securiti with the same tenant/domain configuration as www.3m.com. This site
 * renders no consent UI of its own. This module only:
 *   1. loads the Securiti tags (from the delayed phase, so they never affect LCP)
 *   2. reads the visitor's choice from Securiti's consent cookie
 *   3. exposes it to analytics.js, target.js, identity.js and the insights panel
 *
 * Category ids follow 3M's Securiti purposes:
 *   essential          15  Essential (always on)
 *   advertising        13  Advertising
 *   analytics          14  Analytics & Customization — 3M files Adobe Analytics
 *                          (AMCV, s_ecid, s_pers…) and Target personalization here
 *   business-insights 7554 Business Insights (6sense)
 *   performance        16  Performance & Functionality
 *
 * Earlier code asked for `necessary` and `personalization`; both are still
 * answered (see ALIASES) so subscribers do not need to know about the new ids.
 *
 * Until the visitor decides there is no consent cookie, so nothing optional
 * runs. Revoking in the Preference Center stops collection immediately.
 */

const TENANT_UUID = '0638aaa2-354a-44c0-a777-ea4db9f7bf8a';
const DOMAIN_UUID = '6b6b9bd3-ba56-4136-8ed8-6ca3b3b8433b';
const CDN = 'https://cdn-prod.securiti.ai/consent';
const BACKEND_URL = 'https://app.securiti.ai';

const CONSENT_COOKIE = '__privaci_cookie_consents';
/** Every cookie Securiti uses to remember a visitor, cleared by `?consent-reset`. */
const SECURITI_COOKIES = [
  CONSENT_COOKIE,
  '__privaci_cookie_consent_uuid',
  '__privaci_cookie_consent_generated',
  '__privaci_cookie_no_action',
  '__privaci_latest_published_version',
];

/** Category id → Securiti purpose id. */
const PURPOSES = {
  essential: 15,
  advertising: 13,
  analytics: 14,
  'business-insights': 7554,
  performance: 16,
};

const OPTIONAL = Object.keys(PURPOSES).filter((id) => id !== 'essential');

/** Legacy category names, answered from the category that now covers them. */
const ALIASES = {
  necessary: 'essential',
  personalization: 'analytics',
};

/**
 * Matches Securiti's banner, Preference Center and the footer entry point, so
 * analytics never tracks interactions with privacy plumbing.
 */
export const CONSENT_UI_SELECTOR = '.cc-window, #cookiePreferencesDialog, .securitiCookieWall, [data-consent-reopen]';

const listeners = new Set();
let state = null;

/* ────────────────────────────── cookies ────────────────────────────────── */

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function expireCookie(name) {
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

/** @returns {object|null} granted state per category id */
function read() {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const { consents } = JSON.parse(raw);
    if (!consents || typeof consents !== 'object') return null;
    return Object.fromEntries(Object.entries(PURPOSES).map(([id, purpose]) => [
      id,
      id === 'essential' || Number(consents[purpose]) === 1,
    ]));
  } catch (e) {
    return null;
  }
}

/* ────────────────────────────── public API ─────────────────────────────── */

/** @returns {object|null} granted state per category id (and legacy alias) */
export function getConsent() {
  if (!state) return null;
  const aliases = Object.fromEntries(Object.entries(ALIASES)
    .map(([alias, id]) => [alias, state[id]]));
  return { ...state, ...aliases };
}

/** @param {string} category @returns {boolean} */
export function hasConsent(category) {
  return getConsent()?.[category] === true;
}

/**
 * Subscribe to consent changes. Fires immediately with the current value if a
 * decision already exists, so late subscribers never miss the grant.
 * @param {(categories: object|null) => void} fn
 * @returns {() => void} unsubscribe
 */
export function onConsentChange(fn) {
  listeners.add(fn);
  if (state) fn(getConsent());
  return () => listeners.delete(fn);
}

/**
 * Opens 3M's Securiti Cookie Preference Center (the banner itself is shown by
 * Securiti on its own). Does nothing until the SDK has loaded. Existing callers
 * still pass `{ mode }`; it no longer changes anything.
 */
export function openConsent() {
  window.showConsentPreferencesPopup?.();
}

/** Re-reads Securiti's cookie and notifies subscribers if the choice changed. */
function sync() {
  const next = read();
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  if (state) {
    document.documentElement.dataset.consent = OPTIONAL
      .filter((id) => state[id]).join(' ') || 'essential';
  } else {
    delete document.documentElement.dataset.consent;
  }
  listeners.forEach((fn) => {
    try {
      fn(getConsent());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[consent] listener failed', e);
    }
  });
}

/* ────────────────────────────── Securiti ───────────────────────────────── */

function addScript(src, attrs = {}) {
  const script = document.createElement('script');
  script.src = src;
  script.async = false; // keep 3M's tag order: auto-blocking first, then the loader
  Object.entries(attrs).forEach(([name, value]) => script.setAttribute(name, value));
  document.head.append(script);
}

/** The same two tags www.3m.com carries in its <head>. */
function loadSecuriti() {
  if (document.querySelector(`script[data-domain-uuid="${DOMAIN_UUID}"]`)) return;
  addScript(`${CDN}/auto_blocking/${TENANT_UUID}/${DOMAIN_UUID}.js`);
  addScript(`${CDN}/cookie-consent-sdk-loader.js`, {
    'data-tenant-uuid': TENANT_UUID,
    'data-domain-uuid': DOMAIN_UUID,
    'data-backend-url': BACKEND_URL,
    'data-skip-css': 'false',
  });
}

/**
 * Securiti replays queued `[eventName, callback]` entries once it boots, and
 * updates its cookie before firing these.
 */
function subscribeToSecuriti() {
  window.SecuritiDataLayer = window.SecuritiDataLayer || [];
  window.SecuritiDataLayer.push(['onConsentGiven', sync]);
  window.SecuritiDataLayer.push(['onImplicitConsent', sync]);
}

/**
 * Wires the footer's "Cookie Preferences" legal link (authored per locale) to
 * the Preference Center, adding one if the footer does not have it.
 */
function addFooterEntryPoint() {
  const attach = () => {
    const legal = document.querySelector('footer .footer-legal');
    if (!legal) return false;
    if (legal.querySelector('[data-consent-reopen]')) return true;
    let link = [...legal.querySelectorAll('a')].find((a) => /cookie/i.test(a.textContent)
      || a.hash === '#cookie-preferences');
    if (!link) {
      link = document.createElement('a');
      link.textContent = 'Cookie Preferences';
      legal.append(link);
    }
    link.href = '#cookie-preferences';
    link.removeAttribute('target');
    link.removeAttribute('rel');
    link.setAttribute('aria-haspopup', 'dialog');
    link.dataset.consentReopen = '';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openConsent({ mode: 'preferences' });
    });
    return true;
  };
  if (attach()) return;
  const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}

/** Removes choices stored by the site's earlier, self-built banners. */
function clearLegacyConsent() {
  try {
    window.localStorage.removeItem('threem-consent');
    window.sessionStorage.removeItem('threem-consent-dismissed');
  } catch (e) { /* noop */ }
  if (readCookie('threem_consent') !== null) expireCookie('threem_consent');
}

/** Boots consent: restores any stored Securiti decision, then loads Securiti. */
export function initConsent() {
  clearLegacyConsent();

  // `?consent-reset=1` forgets the visitor's choice so the banner shows again.
  if (new URLSearchParams(window.location.search).has('consent-reset')) {
    SECURITI_COOKIES.forEach(expireCookie);
  }

  sync();
  subscribeToSecuriti();
  addFooterEntryPoint();
  loadSecuriti();
}

export default initConsent;
