/**
 * consent.js — site-wide cookie consent, modelled on the 3M.com consent banner
 * and "3M Cookie Preference Center".
 *
 * Consent is the on-switch for analytics: scripts/analytics.js queues every
 * event until `analytics` consent is granted, then flushes the queue. Revoking
 * consent stops collection immediately.
 *
 * Categories mirror the ones 3M.com uses:
 *   - essential          always on, cannot be disabled
 *   - advertising        ad campaigns, targeted advertising (GPC opts out)
 *   - analytics          "Analytics & Customization" — Adobe Analytics, Web SDK
 *                        identity and Target personalization live here on 3M.com
 *   - business-insights  account identification (6sense); on by default in the US
 *   - performance        "Performance & Functionality"
 *
 * Earlier code asked for `necessary` and `personalization`; both are still
 * answered (see ALIASES) so subscribers do not need to know about the new ids.
 *
 * The choice is persisted in localStorage AND a first-party cookie, so a
 * server-side or tag-manager consumer can read it too.
 */
import { loadCSS } from './aem.js';

const STORAGE_KEY = 'threem-consent';
const COOKIE_NAME = 'threem_consent';
const DISMISS_KEY = 'threem-consent-dismissed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
// v2 introduced the 3M.com category set; v1 decisions are asked again.
const VERSION = 2;

const PRIVACY_URL = 'https://www.3m.com/3M/en_US/company-us/privacy-policy/';
const COOKIE_NOTICE_URL = 'https://www.3m.com/3M/en_US/company-us/cookie-notice/';
const TERMS_URL = 'https://www.3m.com/3M/en_US/company-us/legal-information/';

export const CATEGORIES = [
  {
    id: 'essential',
    title: 'Essential',
    required: true,
    description: 'Essential (or strictly necessary) Cookies are required for the operation of the Website and Apps. They include, for example, Cookies that enable you to log into secure areas of the Website and/or Apps, use a shopping cart or make use of e-billing services.',
  },
  {
    id: 'advertising',
    title: 'Advertising',
    description: 'Advertising Cookies are used by us and third parties who partner with us to execute advertising campaigns and allow us to deliver targeted advertising to you as well as help measure the effectiveness of the advertising campaigns on our Website and Apps.',
    optOut: 'We will not be able to provide you with interest-based offers or ads.',
  },
  {
    id: 'analytics',
    title: 'Analytics & Customization',
    description: 'Analytics & Customization allow us to provide you with the most relevant web content based on your preferences or actions. These Cookies allow our Website and Apps to remember the choices you make (such as your username, language, or the region you are in) to provide you with a more personalized online experience.',
    optOut: 'We will not be able to analyze your site usage to provide custom content.',
  },
  {
    id: 'business-insights',
    title: 'Business Insights',
    default: true,
    description: 'Business Insights cookies help us identify the organization associated with your visit, understand your interests and engagement with our site, and estimate your organization\'s interest in our products so we can deliver more relevant business-to-business advertising.',
    optOut: 'We will no longer be able to identify the organization you are visiting from or use your activity on our site for business insights purposes.',
  },
  {
    id: 'performance',
    title: 'Performance & Functionality',
    description: 'Performance & Functionality allow us to recognize and count the number of visitors and to see how visitors move around the Website and Apps when they are using it. This helps us to improve the way the Website and Apps work, for example, by ensuring that users are finding what they are looking for easily.',
    optOut: 'We will not be able to conduct analytics to optimize site functionality and performance.',
  },
];

const OPTIONAL = CATEGORIES.filter((c) => !c.required).map((c) => c.id);

/** Legacy category names, answered from the category that now covers them. */
const ALIASES = {
  necessary: 'essential',
  personalization: 'analytics',
};

/**
 * Global Privacy Control is an opt-out of "sales"/"sharing", which on 3M.com
 * means the Advertising category. It is honoured as the default and by
 * "Consent to All"; the visitor can still switch Advertising on explicitly.
 */
const gpc = () => navigator.globalPrivacyControl === true;

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
  const categories = { essential: true };
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

/** @returns {object|null} granted state per category id (and legacy alias) */
export function getConsent() {
  if (!state) return null;
  const aliases = Object.fromEntries(Object.entries(ALIASES)
    .map(([alias, id]) => [alias, state.categories[id]]));
  return { ...state.categories, ...aliases };
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

function markDocument() {
  document.documentElement.dataset.consent = OPTIONAL
    .filter((id) => state.categories[id]).join(' ') || 'essential';
}

function setConsent(categories) {
  state = normalize({ version: VERSION, categories, updatedAt: new Date().toISOString() });
  persist(state);
  markDocument();
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

const ICONS = {
  close: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M0.913974 0C0.68048 0 0.443788 0.0906584 0.266128 0.268434C-0.0887093 0.623271 -0.0887093 1.20926 0.266128 1.56385L6.70228 8L0.266128 14.4361C-0.0887093 14.791 -0.0887093 15.377 0.266128 15.7316C0.438001 15.9034 0.67811 16 0.913974 16C1.14984 16 1.38969 15.9038 1.56182 15.7316L7.99797 9.29542L14.4341 15.7316C14.606 15.9034 14.8461 16 15.082 16C15.3138 16 15.5466 15.9149 15.7298 15.7316C16.0846 15.3767 16.0846 14.7907 15.7298 14.4361L9.29366 8L15.7298 1.56385C16.0846 1.20902 16.0846 0.623029 15.7298 0.268434C15.375 -0.0861618 14.789 -0.0864036 14.4344 0.268434L7.99824 6.70458L1.56209 0.268434C1.38467 0.091012 1.14799 0 0.914245 0H0.913974Z"/></svg>',
  preferences: '<svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true"><rect x="0.899" y="0.4" width="1.7" height="11" rx="0.85"/><path fill-rule="evenodd" d="M2.59893 13.0503C2.34824 13.2386 2.03663 13.3501 1.69897 13.3501C1.40484 13.3501 1.13048 13.2655 0.898926 13.1192V14.0413C0.898926 14.5108 1.27948 14.8913 1.74893 14.8913C2.21837 14.8913 2.59893 14.5108 2.59893 14.0413V13.0503Z"/><circle cx="1.75" cy="10.4497" r="1.75"/><rect x="11.889" y="0.4" width="1.7" height="11" rx="0.85"/><path fill-rule="evenodd" d="M13.5892 13.0503C13.3385 13.2386 13.0269 13.3501 12.6892 13.3501C12.3951 13.3501 12.1207 13.2655 11.8892 13.1192V14.0413C11.8892 14.5108 12.2697 14.8913 12.7392 14.8913C13.2086 14.8913 13.5892 14.5108 13.5892 14.0413V13.0503Z"/><circle cx="12.7402" cy="10.4497" r="1.75"/><rect x="7.999" y="14.891" width="1.7" height="11" rx="0.85" transform="rotate(-180 7.999 14.891)"/><path fill-rule="evenodd" d="M6.29902 2.85449C6.54971 2.60345 6.86131 2.45469 7.19897 2.45469C7.49311 2.45469 7.76747 2.56757 7.99902 2.76261L7.99902 1.24981C7.99902 0.780365 7.61847 0.399806 7.14902 0.399806C6.67958 0.399806 6.29902 0.780364 6.29902 1.24981L6.29902 2.85449Z"/><circle cx="7.1499" cy="5.45312" r="1.75" transform="rotate(-180 7.1499 5.45312)"/></svg>',
  chevronRight: '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.327 13.42 1.18 1.18 6.6-6.6-6.6-6.6-1.18 1.18L9.747 8l-5.42 5.42Z"/></svg>',
  chevronLeft: '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.415 16.335 10.83 11.75l4.585-4.585L14 5.75l-6 6 6 6 1.415-1.415Z"/></svg>',
  chevronDown: '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M12.4 6.2 9 9.7 5.6 6.2 4.5 7.3 9 11.8l4.5-4.5-1.1-1.1z"/></svg>',
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const extLink = (href, text, cls = '') => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"${cls ? ` class="${cls}"` : ''}>${esc(text)}</a>`;

let inventory = null;
/** The provider/cookie inventory is only fetched when a details view opens. */
function loadInventory() {
  inventory = inventory || fetch(`${window.hlx.codeBasePath}/scripts/consent-inventory.json`)
    .then((resp) => (resp.ok ? resp.json() : {}))
    .catch(() => ({}));
  return inventory;
}

let ui = null;

function focusable(root) {
  return [...root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled && el.offsetParent !== null);
}

function trapFocus(e, container) {
  const items = focusable(container);
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

/** Starting toggle values: the stored decision, else the 3M.com defaults. */
function initialDraft() {
  const current = getConsent();
  return OPTIONAL.reduce((acc, id) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    let on = current ? current[id] === true : cat.default === true;
    if (!current && id === 'advertising' && gpc()) on = false;
    return { ...acc, [id]: on };
  }, { essential: true });
}

function allOf(value) {
  return OPTIONAL.reduce((acc, id) => ({
    ...acc,
    [id]: value && !(id === 'advertising' && gpc()),
  }), { essential: true });
}

function switchHTML(cat, on, suffix) {
  const id = `consent-${cat.id}-${suffix}`;
  return `
    <div class="consent-switch">
      <input type="checkbox" id="${id}" data-category="${cat.id}" aria-label="${esc(cat.title)}"${on ? ' checked' : ''}>
      <span class="consent-switch-slider" aria-hidden="true"></span>
      <label for="${id}" class="consent-switch-status">${on ? 'Accepted' : 'Rejected'}</label>
    </div>`;
}

function optOutHTML(cat, on) {
  return cat.optOut
    ? `<div class="consent-opt-out" data-opt-out="${cat.id}" aria-live="polite"${on ? ' hidden' : ''}>${esc(cat.optOut)}</div>`
    : '';
}

function bannerHTML() {
  return `
    <div class="consent-banner" role="dialog" aria-live="polite" aria-label="Cookie consent"
         aria-describedby="consent-banner-desc">
      <div class="consent-banner-message" id="consent-banner-desc">
        <p>By using this website, you accept 3M’s ${extLink(COOKIE_NOTICE_URL, 'Cookie Notice')}, ${extLink(PRIVACY_URL, 'Global Privacy Statement')}
        and ${extLink(TERMS_URL, 'Terms of Use')}. 3M uses cookies and similar technologies to ensure the proper
        functioning of our website, analyze usage, personalize content, assess the effectiveness of
        advertisements, and provide features from third parties. We use essential cookies to operate
        this website. Where applicable, we also use Business Insights cookies to help us identify the
        organization associated with your visit, understand interests and engagement with our site, and
        estimate your organization’s interest in our products. Other non-essential cookies will not be
        used unless you consent to them. You can select “Consent to All Non-Essential Cookies” to allow
        all cookie categories, select “Reject Non-Essential Cookies” to reject non-essential cookies, or
        choose “Cookie Preferences” to review and change your choices, including Business Insights, at
        any time.</p>
      </div>
      <div class="consent-banner-actions">
        <button type="button" class="consent-btn" data-consent="accept">Consent to All Non-Essential Cookies</button>
        <button type="button" class="consent-btn" data-consent="reject">Reject Non-Essential Cookies</button>
        <button type="button" class="consent-pref-link" data-consent="preferences" aria-haspopup="dialog"
                aria-controls="consent-preferences">
          <span class="consent-pref-icon">${ICONS.preferences}</span><span>Cookie Preferences</span>
        </button>
      </div>
      <button type="button" class="consent-banner-close" data-consent="dismiss" aria-label="Close banner">${ICONS.close}</button>
    </div>`;
}

function listHTML(draft) {
  const tiles = CATEGORIES.map((cat) => `
    <li class="consent-tile">
      <div class="consent-tile-action">
        ${cat.required ? '<span class="consent-always">Always Active</span>' : switchHTML(cat, draft[cat.id], 'list')}
      </div>
      <div class="consent-tile-content">
        <h3>${esc(cat.title)}</h3>
        <p>${esc(cat.description)}</p>
        ${optOutHTML(cat, draft[cat.id])}
      </div>
      <div class="consent-tile-action">
        <button type="button" class="consent-tile-details" data-consent="details" data-category="${cat.id}"
                aria-label="View details for ${esc(cat.title)}">${ICONS.chevronRight}</button>
      </div>
    </li>`).join('');

  return `
    <div class="consent-intro">
      <p><strong>Your Cookie Preferences</strong><br><br>
      This website uses first- and third-party cookies, pixels, and similar technologies (“cookies”) to
      enable website features and functionality; measure, analyze, and improve site usage and
      performance; enhance user experience; record user sessions and interactions; personalize content;
      and support our advertising and marketing. You can review and adjust your cookie preferences below.
      Essential cookies are always activated since they are essential to provide the basic
      functionalities of the website. For more information about how we utilize cookies, please visit
      our ${extLink(PRIVACY_URL, 'Privacy Policy')} and our ${extLink(COOKIE_NOTICE_URL, 'Cookie Notice')}.<br><br>
      Please note that your preferences are browser- and device-specific. If you come back to this
      website from a different device or use a different browser on the same device, you will need to
      adjust your cookie preferences for that browser or device as well. In addition, if you access a
      different 3M website, you will need to set your preferences for that website.<br><br>
      <strong>“Targeted Advertising”/“Sales”/“Sharing”:</strong> Website visitors may have the right
      under applicable state privacy laws, including the California Consumer Privacy Act (CCPA), to opt
      out of the use of their personal information for certain uses, including “targeted advertising”,
      “sales” or “sharing”, as such terms are defined under relevant laws. Under the CCPA and other
      applicable laws, sales may include disclosing or making available personal information to a third
      party in exchange for monetary or other valuable consideration; under the CCPA sharing includes
      cross-context behavioral advertising. You can opt out of “targeted advertising” by toggling
      [“Advertising”] off below.<br><br>
      Our website also recognizes the ${extLink('https://globalprivacycontrol.org/', 'Global Privacy Control')}
      (GPC), an opt-out preference signal. If we recognize that your browser is transmitting a GPC
      signal, we will apply that to opt you out of “sales” and “sharing” for that browser. To learn more
      about how to exercise your privacy choices and rights, review our ${extLink(PRIVACY_URL, 'Privacy Policy')}.
      California residents can review the California section of our Privacy Policy directly by clicking
      ${extLink(`${PRIVACY_URL}#residents`, 'here')}.</p>
    </div>
    <div class="consent-select-all">
      <button type="button" class="consent-link-btn" data-consent="select-all">Select All</button>
      <button type="button" class="consent-link-btn" data-consent="unselect-all">Unselect All</button>
      <div class="consent-sr-only" aria-live="polite" aria-atomic="true" data-consent-announce></div>
    </div>
    <ul class="consent-list">${tiles}</ul>`;
}

function providersHTML(providers, label) {
  return providers.map((provider, i) => {
    const panelId = `consent-provider-${label}-${i}`;
    const cookies = provider.cookies.map((cookie) => `
      <div class="consent-cookie">
        <h5>${esc(cookie.name)}</h5>
        ${cookie.description ? `<p>${esc(cookie.description)}</p>` : ''}
        <table aria-label="${esc(cookie.name)}">
          <tbody>
            <tr><th scope="row">Type</th><td>${esc(cookie.type)}</td></tr>
            <tr><th scope="row">Cookie Domain</th><td>${esc(cookie.domain)}</td></tr>
            ${cookie.country ? `<tr><th scope="row">Cookie Origin Country</th><td>${esc(cookie.country)}</td></tr>` : ''}
          </tbody>
        </table>
      </div>`).join('');
    return `
      <div class="consent-provider">
        <div class="consent-provider-header" data-consent="provider">
          <div>
            <h4>
              <button type="button" class="consent-provider-toggle" aria-expanded="false"
                      aria-controls="${panelId}">${esc(provider.name)}</button>
            </h4>
            ${provider.links.map((href) => extLink(href, href, 'consent-provider-link')).join('')}
          </div>
          <span class="consent-provider-chevron">${ICONS.chevronDown}</span>
        </div>
        <div class="consent-provider-cookies" id="${panelId}" role="region" aria-label="${esc(provider.name)} cookies" hidden>
          ${cookies}
        </div>
      </div>`;
  }).join('');
}

async function detailsHTML(cat, draft) {
  const groups = (await loadInventory())[cat.id] || {};
  const group = (key, title, copy) => (groups[key]?.length ? `
    <section class="consent-providers">
      <h3>${title}</h3>
      <p>${copy}</p>
      ${providersHTML(groups[key], `${cat.id}-${key}`)}
    </section>` : '');

  return `
    <div class="consent-details-header">
      <div class="consent-details-title">
        <h3 tabindex="-1">${esc(cat.title)}</h3>
        ${cat.required ? '<span class="consent-always">Always Active</span>' : switchHTML(cat, draft[cat.id], 'details')}
      </div>
      ${optOutHTML(cat, draft[cat.id])}
      <p>${esc(cat.description)}</p>
    </div>
    ${group('firstParty', 'First Party Cookie Providers', 'First-party cookies are set by the website that the user visits, i.e. the host domain. Websites use first-party cookies usually for, amongst other purposes, tracking visitors’ behavior on the site and personalizing their browsing experience online.')}
    ${group('thirdParty', 'Third Party Cookie Providers', 'Third-party cookies are placed on a website by other third-party entities, and not the website itself, i.e. a domain other than the one the user sees in the address bar. Third-party cookies usually track the visitors’ behavior between websites and are generally used for targeted advertising purposes.')}`;
}

function modalHTML() {
  return `
    <div class="consent-modal-layer" hidden>
      <div class="consent-modal" id="consent-preferences" role="dialog" aria-modal="true"
           aria-labelledby="consent-modal-title">
        <div class="consent-modal-body">
          <div class="consent-modal-header">
            <h2 id="consent-modal-title">3M Cookie Preference Center</h2>
            <button type="button" class="consent-back" data-consent="back" hidden>${ICONS.chevronLeft}<span>Back</span></button>
            <button type="button" class="consent-modal-close" data-consent="close-preferences" aria-label="Close Dialog">${ICONS.close}</button>
          </div>
          <div class="consent-view" data-view="list"></div>
          <div class="consent-view" data-view="details" hidden></div>
        </div>
        <div class="consent-modal-footer">
          <button type="button" class="consent-btn consent-save" data-consent="save">Save Changes</button>
        </div>
      </div>
    </div>`;
}

function render() {
  if (ui) return ui;
  const styled = loadCSS(`${window.hlx.codeBasePath}/styles/consent.css`);

  const root = document.createElement('div');
  root.className = 'consent';
  // Kept out of the layout until its stylesheet applies: unstyled, the banner
  // would sit in the page flow for a moment and push the whole page down.
  root.hidden = true;
  root.innerHTML = `${bannerHTML()}${modalHTML()}`;

  const banner = root.querySelector('.consent-banner');
  const layer = root.querySelector('.consent-modal-layer');
  const modal = root.querySelector('.consent-modal');
  const title = root.querySelector('#consent-modal-title');
  const back = root.querySelector('.consent-back');
  const listView = root.querySelector('[data-view="list"]');
  const detailsView = root.querySelector('[data-view="details"]');

  let draft = initialDraft();
  let opener = null;
  let detailsFor = null;

  const syncToggles = () => {
    root.querySelectorAll('.consent-modal input[data-category]').forEach((input) => {
      const on = draft[input.dataset.category] === true;
      input.checked = on;
      input.parentElement.querySelector('.consent-switch-status').textContent = on ? 'Accepted' : 'Rejected';
    });
    root.querySelectorAll('[data-opt-out]').forEach((el) => {
      el.hidden = draft[el.dataset.optOut] === true;
    });
  };

  const showList = (focusCategory) => {
    detailsFor = null;
    detailsView.hidden = true;
    detailsView.replaceChildren();
    listView.hidden = false;
    title.hidden = false;
    back.hidden = true;
    syncToggles();
    if (focusCategory) {
      listView.querySelector(`[data-consent="details"][data-category="${focusCategory}"]`)?.focus();
    }
  };

  const showDetails = async (id) => {
    const cat = CATEGORIES.find((c) => c.id === id);
    detailsFor = id;
    detailsView.innerHTML = await detailsHTML(cat, draft);
    if (detailsFor !== id) return; // visitor navigated away while loading
    listView.hidden = true;
    detailsView.hidden = false;
    title.hidden = true;
    back.hidden = false;
    modal.scrollTop = 0;
    detailsView.querySelector('.consent-details-title h3')?.focus();
  };

  const closeBanner = () => {
    banner.hidden = true;
  };

  const closePreferences = () => {
    layer.hidden = true;
    document.removeEventListener('keydown', ui.onKeydown, true);
    if (opener?.isConnected && !opener.closest('[hidden]')) opener.focus();
    opener = null;
  };

  const openPreferences = () => {
    opener = document.activeElement;
    draft = initialDraft();
    listView.innerHTML = listHTML(draft);
    showList();
    layer.hidden = false;
    modal.scrollTop = 0;
    document.addEventListener('keydown', ui.onKeydown, true);
    root.querySelector('.consent-modal-close').focus();
  };

  const decide = (categories) => {
    setConsent(categories);
    closePreferences();
    root.remove();
    ui = null;
  };

  const onKeydown = (e) => {
    if (layer.hidden) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (detailsFor) showList(detailsFor);
      else closePreferences();
    } else if (e.key === 'Tab') {
      trapFocus(e, modal);
    }
  };

  // Clicking the dimmed backdrop closes the preference center without saving.
  layer.addEventListener('click', (e) => {
    if (e.target === layer) closePreferences();
  });

  root.addEventListener('change', (e) => {
    const { category } = e.target.dataset;
    if (!category) return;
    draft[category] = e.target.checked;
    syncToggles();
  });

  root.addEventListener('click', (e) => {
    // links (legal pages, provider policies) just navigate
    if (e.target.closest('a')) return;
    const trigger = e.target.closest('[data-consent]');
    if (!trigger) return;
    const action = trigger.dataset.consent;
    if (action === 'accept') decide(allOf(true));
    else if (action === 'reject') decide(allOf(false));
    else if (action === 'preferences') openPreferences();
    else if (action === 'dismiss') {
      // Closing the banner is not consent: hide it for this browser session
      // and keep every non-essential category off until the visitor chooses.
      try {
        window.sessionStorage.setItem(DISMISS_KEY, '1');
      } catch (err) { /* noop */ }
      closeBanner();
    } else if (action === 'close-preferences') closePreferences();
    else if (action === 'save') decide({ ...draft });
    else if (action === 'details') showDetails(trigger.dataset.category);
    else if (action === 'back') showList(detailsFor);
    else if (action === 'select-all' || action === 'unselect-all') {
      const on = action === 'select-all';
      OPTIONAL.forEach((id) => { draft[id] = on; });
      syncToggles();
      root.querySelector('[data-consent-announce]').textContent = on
        ? 'All cookie categories selected' : 'All cookie categories unselected';
    } else if (action === 'provider') {
      // the whole provider header is the hit area; the button carries the state
      const toggle = trigger.querySelector('.consent-provider-toggle');
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      trigger.closest('.consent-provider').classList.toggle('consent-provider-open', open);
      root.querySelector(`#${toggle.getAttribute('aria-controls')}`).hidden = !open;
    }
  });

  const ready = styled.catch(() => {}).then(() => { root.hidden = false; });
  ui = {
    root, banner, onKeydown, openPreferences, closeBanner, ready,
  };
  // First in the DOM so keyboard users reach the choice before page content.
  document.body.prepend(root);
  return ui;
}

/**
 * Renders the consent experience.
 * @param {{mode?: 'banner'|'preferences'}} [options]
 */
export async function openConsent({ mode = 'banner' } = {}) {
  const view = render();
  await view.ready;
  if (mode === 'preferences') {
    // Revisiting from the footer: open the preference center on its own.
    if (state) view.closeBanner();
    view.openPreferences();
  } else {
    view.banner.hidden = false;
  }
}

/**
 * Wires the footer's "Cookie Preferences" legal link (authored per locale) to
 * the preference center, adding one if the footer does not have it.
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
      // styled (and sized as a tap target) like the footer's other legal links
      link.className = 'footer-legal-link';
      const sep = document.createElement('span');
      sep.className = 'footer-legal-sep';
      sep.textContent = '|';
      sep.setAttribute('aria-hidden', 'true');
      legal.append(sep, link);
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

/** Boots consent: restores a stored decision or shows the banner on first visit. */
export function initConsent() {
  state = load();
  addFooterEntryPoint();

  // `?consent-reset=1` wipes the decision — handy mid-demo to re-show the banner.
  if (new URLSearchParams(window.location.search).has('consent-reset')) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(DISMISS_KEY);
    } catch (e) { /* noop */ }
    writeCookie('');
    state = null;
  }

  if (state) {
    markDocument();
    listeners.forEach((fn) => fn(getConsent()));
    return;
  }

  let dismissed = false;
  try {
    dismissed = window.sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch (e) { /* noop */ }
  if (!dismissed) openConsent({ mode: 'banner' });
}

export default initConsent;
