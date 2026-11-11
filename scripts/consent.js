/**
 * consent.js — bridges 3M's Securiti.ai consent platform into the site.
 *
 * The consent banner and Cookie Preference Center are 3M's own, served by
 * Securiti with the same tenant/domain configuration as www.3m.com. This site
 * renders no consent UI of its own. This module only:
 *   1. loads the Securiti tags (from the delayed phase, so they never affect LCP)
 *   2. reads the visitor's choice from Securiti's consent cookie
 *   3. exposes it to analytics.js, target.js and identity.js
 *
 * Securiti purpose → site category:
 *   15  Essential                   → necessary        (always on)
 *   16  Performance & Functionality → analytics        (Adobe Analytics / Web SDK)
 *   14  Analytics & Customization   → personalization  (Adobe Target)
 *   13  Advertising, 7554 Business Insights → not used by site code
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

/** Site category → Securiti purpose id. */
const PURPOSES = {
  necessary: 15,
  analytics: 16,
  personalization: 14,
};

/**
 * Matches Securiti's banner, Preference Center and our footer entry point, so
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

/** @returns {{necessary: boolean, analytics: boolean, personalization: boolean}|null} */
function read() {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const { consents } = JSON.parse(raw);
    if (!consents || typeof consents !== 'object') return null;
    return Object.fromEntries(Object.entries(PURPOSES).map(([category, purpose]) => [
      category,
      category === 'necessary' || Number(consents[purpose]) === 1,
    ]));
  } catch (e) {
    return null;
  }
}

/* ────────────────────────────── public API ─────────────────────────────── */

/** @returns {{necessary: boolean, analytics: boolean, personalization: boolean}|null} */
export function getConsent() {
  return state ? { ...state } : null;
}

/** @param {string} category @returns {boolean} */
export function hasConsent(category) {
  return state?.[category] === true;
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

/** Opens 3M's Securiti Cookie Preference Center, once the SDK has loaded. */
export function openPreferences() {
  window.showConsentPreferencesPopup?.();
}

/** Re-reads Securiti's cookie and notifies subscribers if the choice changed. */
function sync() {
  const next = read();
  if (JSON.stringify(next) === JSON.stringify(state)) return;
  state = next;
  if (state) {
    document.documentElement.dataset.consent = ['analytics', 'personalization']
      .filter((id) => state[id]).join(' ') || 'necessary';
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
 * Adds a "Cookie Preferences" entry point to the footer legal row, as on
 * www.3m.com, so visitors can revisit their choice.
 */
function addFooterEntryPoint() {
  const attach = () => {
    const legal = document.querySelector('footer .footer-legal');
    if (!legal || legal.querySelector('[data-consent-reopen]')) return false;
    const link = document.createElement('a');
    link.href = '#cookie-preferences';
    link.textContent = 'Cookie Preferences';
    link.dataset.consentReopen = '';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openPreferences();
    });
    legal.append(link);
    return true;
  };
  if (attach()) return;
  const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}

/** Removes the choice stored by the site's previous, self-built banner. */
function clearLegacyConsent() {
  try {
    window.localStorage.removeItem('threem-consent');
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
