/**
 * consent.js — site-wide cookie consent for the 3M EDS demo.
 *
 * Consent is the on-switch for analytics: scripts/analytics.js queues every
 * event until `analytics` consent is granted, then flushes the queue. Revoking
 * consent stops collection immediately.
 *
 * Categories intentionally mirror the common TCF/IAB-style grouping so the
 * model reads as credible to a privacy team:
 *   - necessary        always on, cannot be disabled
 *   - analytics        measurement / performance (gates the data layer + Web SDK)
 *   - personalization  Target, advertising, cross-site profiling
 *
 * The choice is persisted in localStorage AND a first-party cookie, so a
 * server-side or tag-manager consumer can read it too.
 */
import { loadCSS } from './aem.js';

const STORAGE_KEY = 'threem-consent';
const COOKIE_NAME = 'threem_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
const VERSION = 1;

export const CATEGORIES = [
  {
    id: 'necessary',
    title: 'Strictly necessary',
    required: true,
    description: 'Required for the site to function — security, load balancing and remembering this very choice. These cannot be switched off.',
  },
  {
    id: 'analytics',
    title: 'Analytics & performance',
    description: 'Helps us understand which content and products people engage with, so we can improve the experience. Data is aggregated and never sold.',
  },
  {
    id: 'personalization',
    title: 'Personalization & advertising',
    description: 'Lets us tailor offers, recommendations and campaigns to your interests, on this site and on others.',
  },
];

const OPTIONAL = CATEGORIES.filter((c) => !c.required).map((c) => c.id);

const listeners = new Set();
let state = null;

/* ────────────────────────────── persistence ────────────────────────────── */

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(value) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
}

function normalize(raw) {
  if (!raw || typeof raw !== 'object' || raw.version !== VERSION) return null;
  const categories = { necessary: true };
  OPTIONAL.forEach((id) => { categories[id] = raw.categories?.[id] === true; });
  return { version: VERSION, categories, updatedAt: raw.updatedAt || null };
}

function load() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || readCookie(COOKIE_NAME);
    return stored ? normalize(JSON.parse(stored)) : null;
  } catch (e) {
    return null;
  }
}

function persist(next) {
  const serialized = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, serialized);
  } catch (e) { /* private mode — cookie still carries the choice */ }
  writeCookie(serialized);
}

/* ────────────────────────────── public API ─────────────────────────────── */

/** @returns {{necessary: boolean, analytics: boolean, personalization: boolean}|null} */
export function getConsent() {
  return state ? { ...state.categories } : null;
}

/** @param {string} category @returns {boolean} */
export function hasConsent(category) {
  return state?.categories?.[category] === true;
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

function setConsent(categories) {
  state = normalize({ version: VERSION, categories, updatedAt: new Date().toISOString() });
  persist(state);
  document.documentElement.dataset.consent = OPTIONAL
    .filter((id) => state.categories[id]).join(' ') || 'necessary';
  listeners.forEach((fn) => {
    try {
      fn(getConsent());
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[consent] listener failed', e);
    }
  });
}

/* ──────────────────────────────── UI ───────────────────────────────────── */

let ui = null;
let lastFocused = null;

function focusable(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.offsetParent !== null);
}

function trapFocus(e) {
  if (!ui || e.key !== 'Tab') return;
  const items = focusable(ui.dialog);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function close() {
  if (!ui) return;
  document.removeEventListener('keydown', ui.onKeydown, true);
  ui.root.remove();
  ui = null;
  if (lastFocused?.isConnected) lastFocused.focus();
  lastFocused = null;
}

function decide(categories) {
  setConsent(categories);
  close();
}

function allOf(value) {
  return OPTIONAL.reduce((acc, id) => ({ ...acc, [id]: value }), { necessary: true });
}

function buildToggles(current) {
  return CATEGORIES.map((cat) => {
    const checked = cat.required || current?.[cat.id] ? ' checked' : '';
    const disabled = cat.required ? ' disabled' : '';
    return `
      <div class="consent-category">
        <label class="consent-switch" for="consent-${cat.id}">
          <input type="checkbox" id="consent-${cat.id}" name="${cat.id}"${checked}${disabled}>
          <span class="consent-switch-track" aria-hidden="true"></span>
          <span class="consent-category-title">${cat.title}${cat.required ? '<em>Always on</em>' : ''}</span>
        </label>
        <p class="consent-category-copy">${cat.description}</p>
      </div>`;
  }).join('');
}

/**
 * Renders the consent experience.
 * @param {{mode?: 'banner'|'preferences'}} [options]
 */
export function openConsent({ mode = 'banner' } = {}) {
  if (ui) {
    ui.setView(mode);
    return;
  }
  lastFocused = document.activeElement;
  loadCSS(`${window.hlx.codeBasePath}/styles/consent.css`);

  const root = document.createElement('div');
  root.className = 'consent';
  root.innerHTML = `
    <div class="consent-scrim" data-consent-scrim hidden></div>
    <div class="consent-dialog" role="dialog" aria-modal="false"
         aria-labelledby="consent-heading" aria-describedby="consent-intro">
      <div class="consent-body">
        <p class="consent-eyebrow">Your privacy choices</p>
        <h2 id="consent-heading">We use cookies to improve your 3M experience</h2>
        <p id="consent-intro">
          We use cookies and similar technologies to keep the site reliable, measure how our
          content performs, and personalize what you see. You are in control — choose what
          you are comfortable with, and change it any time.
        </p>
        <form class="consent-categories" data-consent-categories hidden>
          ${buildToggles(getConsent())}
        </form>
        <p class="consent-legal">
          Read our <a href="/en/privacy-policy">Privacy Policy</a> and
          <a href="/en/cookie-notice">Cookie Notice</a>.
        </p>
      </div>
      <div class="consent-actions">
        <button type="button" class="consent-btn consent-btn-ghost" data-consent="manage">Manage preferences</button>
        <button type="button" class="consent-btn consent-btn-ghost" data-consent="save" hidden>Save my choices</button>
        <button type="button" class="consent-btn consent-btn-secondary" data-consent="reject">Reject all</button>
        <button type="button" class="consent-btn consent-btn-primary" data-consent="accept">Accept all</button>
      </div>
    </div>`;

  const dialog = root.querySelector('.consent-dialog');
  const form = root.querySelector('[data-consent-categories]');
  const scrim = root.querySelector('[data-consent-scrim]');
  const manageBtn = root.querySelector('[data-consent="manage"]');
  const saveBtn = root.querySelector('[data-consent="save"]');

  const setView = (view) => {
    const expanded = view === 'preferences';
    form.hidden = !expanded;
    manageBtn.hidden = expanded;
    saveBtn.hidden = !expanded;
    scrim.hidden = !expanded;
    dialog.classList.toggle('consent-dialog-expanded', expanded);
    dialog.setAttribute('aria-modal', String(expanded));
    if (expanded) form.querySelector('input:not([disabled])')?.focus();
  };

  const onKeydown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      // ESC is not consent — it dismisses without granting anything extra.
      decide(getConsent() || allOf(false));
      return;
    }
    trapFocus(e);
  };

  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-consent]')?.dataset.consent;
    if (action === 'manage') setView('preferences');
    else if (action === 'accept') decide(allOf(true));
    else if (action === 'reject') decide(allOf(false));
    else if (action === 'save') {
      decide(OPTIONAL.reduce((acc, id) => (
        { ...acc, [id]: form.elements[id]?.checked === true }
      ), { necessary: true }));
    }
  });

  ui = {
    root, dialog, setView, onKeydown,
  };
  document.body.append(root);
  document.addEventListener('keydown', onKeydown, true);
  setView(mode);
  requestAnimationFrame(() => root.classList.add('consent-visible'));
  dialog.querySelector('.consent-btn-primary')?.focus({ preventScroll: true });
}

/**
 * Adds a "Cookie preferences" entry point to the footer legal row so visitors
 * (and auditors) can revisit the choice — a standard compliance requirement.
 */
function addFooterEntryPoint() {
  const attach = () => {
    const legal = document.querySelector('footer .footer-legal');
    if (!legal || legal.querySelector('[data-consent-reopen]')) return false;
    const link = document.createElement('a');
    link.href = '#cookie-preferences';
    link.textContent = 'Cookie preferences';
    link.dataset.consentReopen = '';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      openConsent({ mode: 'preferences' });
    });
    legal.append(link);
    return true;
  };
  if (attach()) return;
  const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
  observer.observe(document.body, { childList: true, subtree: true });
  window.setTimeout(() => observer.disconnect(), 15000);
}

/** Boots consent: restores a stored decision or shows the banner on first visit. */
export function initConsent() {
  state = load();
  addFooterEntryPoint();

  // `?consent-reset=1` wipes the decision — handy mid-demo to re-show the banner.
  if (new URLSearchParams(window.location.search).has('consent-reset')) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* noop */ }
    writeCookie('');
    state = null;
  }

  if (state) {
    document.documentElement.dataset.consent = OPTIONAL
      .filter((id) => state.categories[id]).join(' ') || 'necessary';
    listeners.forEach((fn) => fn(getConsent()));
  } else {
    openConsent({ mode: 'banner' });
  }
}

export default initConsent;
