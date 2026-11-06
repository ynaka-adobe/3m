/**
 * header — 3M site chrome, matched to www.3m.com. Desktop renders two rows:
 * logo / search / locale on top, primary nav and the account link below.
 * Under 960px it collapses to the 3M mark, a compact search, a hamburger
 * panel and an account bar. Nav links come from a per-locale fragment
 * (/{locale}/nav) so labels and links are authored/translated in DA: the
 * first list is the primary nav, the second holds the account link(s).
 */
const LOCALES = ['en', 'de', 'jp'];
const LOCALE_LABEL = { en: 'US - EN', de: 'DE - DE', jp: 'JP - JA' };
const SEARCH_LOCALE = { en: 'en_US', de: 'de_DE', jp: 'ja_JP' };
const SEARCH_LABEL = { en: 'Search', de: 'Suche', jp: '検索' };
// Language-switcher popup copy, keyed by the page's locale.
const LOCALE_POPUP = {
  en: {
    title: '3M in the United States', change: 'Change 3M Location', save: 'Save', close: 'Close',
  },
  de: {
    title: '3M in Deutschland', change: '3M-Standort ändern', save: 'Speichern', close: 'Schließen',
  },
  jp: {
    title: '日本の3M', change: '3Mの国・地域を変更', save: '保存', close: '閉じる',
  },
};
const LANGUAGE_LABEL = { en: 'English - EN', de: 'Deutsch - DE', jp: '日本語 - JA' };
const CHANGE_LOCATION_URL = 'https://www.3m.com/3M/en_US/select-location/';

async function fetchFragment(path) {
  try {
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const dom = document.createElement('div');
      dom.innerHTML = await resp.text();
      return dom;
    }
  } catch (e) { /* fall through */ }
  return null;
}

// Load the locale's nav fragment, falling back to English.
async function loadNav(locale) {
  const frag = await fetchFragment(`/${locale}/nav`);
  return frag || fetchFragment('/en/nav');
}

// Resolve the car-personalization subnav fragment path, preserving the current locale prefix.
function getCarPersonalizationSubnavPath() {
  const segments = window.location.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('car-personalization');
  if (idx === -1) return null;
  const langPrefix = segments.slice(0, idx).join('/');
  return `/${langPrefix ? `${langPrefix}/` : ''}car-personalization/subnav`;
}

// Load car-personalization subnav if on a car-personalization page/directory
async function loadCarPersonalizationSubnav() {
  const subnavPath = getCarPersonalizationSubnavPath();
  if (!subnavPath) {
    return;
  }

  const frag = await fetchFragment(subnavPath);

  if (frag) {
    // Find the main element and insert subnav as first section
    const main = document.querySelector('main');
    if (main) {
      const subnavSection = document.createElement('div');
      subnavSection.className = 'section';
      subnavSection.innerHTML = `<div class="fragment">${frag.innerHTML}</div>`;
      main.insertBefore(subnavSection, main.firstChild);
    }
  }
}

const icon = (name, cls = '') => `<img class="nav-icon nav-icon-${name} ${cls}" src="/icons/${name}.svg" alt="" aria-hidden="true">`;

// Swap the locale segment of the current path and go there.
function switchLocale(target) {
  const parts = window.location.pathname.split('/');
  if (LOCALES.includes(parts[1])) {
    parts[1] = target;
  } else {
    parts.splice(1, 0, target);
  }
  window.location.pathname = parts.join('/') || '/';
}

function localeToggleHTML(locale, cls) {
  return `
    <div class="nav-locale ${cls}">
      <button class="nav-locale-toggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="nav-locale-popup" aria-label="Select language: ${LOCALE_LABEL[locale]}">
        <span>${LOCALE_LABEL[locale]}</span>${icon('globe')}${icon('chevron-down')}
      </button>
    </div>`;
}

// One popup serves both toggles: anchored under the top-bar toggle on desktop,
// centered over a dimmed page below 960px (as on www.3m.com).
function localePopupHTML(locale) {
  const copy = LOCALE_POPUP[locale];
  return `
    <div class="nav-locale-overlay"></div>
    <div class="nav-locale-popup" id="nav-locale-popup" role="dialog" aria-modal="true" aria-labelledby="nav-locale-title">
      <button class="nav-locale-close" type="button" aria-label="${copy.close}">${icon('close')}</button>
      <div class="nav-locale-title" id="nav-locale-title">${copy.title}</div>
      <form class="nav-locale-form">
        <div class="nav-locale-options">
          ${LOCALES.map((l) => `<label><input type="radio" name="locale" value="${l}"${l === locale ? ' checked' : ''}><span>${LANGUAGE_LABEL[l]}</span></label>`).join('')}
        </div>
        <a class="nav-locale-change" href="${CHANGE_LOCATION_URL}">${copy.change}</a>
        <button class="nav-locale-save" type="submit">${copy.save}</button>
      </form>
    </div>`;
}

export default async function decorate(block) {
  const seg = window.location.pathname.split('/')[1];
  const locale = LOCALES.includes(seg) ? seg : 'en';

  const frag = await loadNav(locale);
  const lists = frag ? [...frag.querySelectorAll('ul')] : [];
  const navAnchors = lists[0] ? [...lists[0].querySelectorAll('a')] : [];
  const actionAnchors = lists[1] ? [...lists[1].querySelectorAll('a')] : [];

  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-3m';
  nav.setAttribute('aria-label', 'Main');
  nav.innerHTML = `
    <div class="nav-top">
      <a class="nav-logo" href="/${locale}/" aria-label="3M home">
        <img class="nav-logo-full" src="/icons/3m-logo.svg" alt="3M. Science. Applied to Life." width="227" height="40">
        <img class="nav-logo-mark" src="/icons/3m-logo-mark.svg" alt="3M" width="55" height="30">
      </a>
      <form class="nav-search" role="search" method="get" action="https://www.3m.com/3M/${SEARCH_LOCALE[locale]}/p/">
        <input type="search" name="Ntt" placeholder="${SEARCH_LABEL[locale]}" aria-label="${SEARCH_LABEL[locale]}" autocomplete="off">
        <button type="submit" aria-label="${SEARCH_LABEL[locale]}">${icon('search-3m')}</button>
      </form>
      <div class="nav-top-end">${localeToggleHTML(locale, 'nav-locale-desktop')}</div>
      <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-panel">
        ${icon('menu', 'nav-burger-open')}${icon('close', 'nav-burger-close')}
      </button>
    </div>
    <div class="nav-bottom">
      <div class="nav-panel" id="nav-panel">
        <ul class="nav-links">
          ${navAnchors.map((a) => `<li><a href="${a.getAttribute('href')}"><span>${a.textContent.trim()}</span>${icon('chevron-down', 'nav-link-arrow')}</a></li>`).join('')}
        </ul>
        ${localeToggleHTML(locale, 'nav-locale-mobile')}
      </div>
      <div class="nav-actions">
        ${actionAnchors.map((a) => `<a class="nav-account" href="${a.getAttribute('href')}">${icon('user')}<span>${a.textContent.trim()}</span>${icon('chevron-down')}</a>`).join('')}
      </div>
    </div>
    ${localePopupHTML(locale)}`;

  // Language switcher popup (opened from the top-bar or mobile-panel toggle).
  const toggles = [...nav.querySelectorAll('.nav-locale-toggle')];
  const popup = nav.querySelector('.nav-locale-popup');
  let opener = null;
  const closeLocale = () => {
    if (!nav.classList.contains('is-locale-open')) return;
    nav.classList.remove('is-locale-open');
    toggles.forEach((t) => t.setAttribute('aria-expanded', 'false'));
    if (opener) opener.focus();
  };
  toggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      if (nav.classList.contains('is-locale-open')) {
        closeLocale();
        return;
      }
      opener = toggle;
      nav.classList.add('is-locale-open');
      toggle.setAttribute('aria-expanded', 'true');
      popup.querySelector('input:checked').focus();
    });
  });
  nav.querySelector('.nav-locale-overlay').addEventListener('click', closeLocale);
  nav.querySelector('.nav-locale-close').addEventListener('click', closeLocale);
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLocale();
  });
  nav.querySelector('.nav-locale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const target = new FormData(e.target).get('locale');
    if (target && target !== locale) switchLocale(target);
    else closeLocale();
  });

  const burger = nav.querySelector('.nav-burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  block.replaceChildren(nav);

  // Load car-personalization subnav if applicable
  loadCarPersonalizationSubnav();
}
