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

function localeHTML(locale, cls) {
  return `
    <div class="nav-locale ${cls}">
      <button class="nav-locale-toggle" type="button" aria-expanded="false" aria-label="Select language: ${LOCALE_LABEL[locale]}">
        <span>${LOCALE_LABEL[locale]}</span>${icon('globe')}${icon('chevron-down')}
      </button>
      <ul class="nav-locale-list">
        ${LOCALES.map((l) => `<li><button type="button" data-locale="${l}"${l === locale ? ' aria-current="true"' : ''}>${LOCALE_LABEL[l]}</button></li>`).join('')}
      </ul>
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
      <div class="nav-top-end">${localeHTML(locale, 'nav-locale-desktop')}</div>
      <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-panel">
        ${icon('menu', 'nav-burger-open')}${icon('close', 'nav-burger-close')}
      </button>
    </div>
    <div class="nav-bottom">
      <div class="nav-panel" id="nav-panel">
        <ul class="nav-links">
          ${navAnchors.map((a) => `<li><a href="${a.getAttribute('href')}"><span>${a.textContent.trim()}</span>${icon('chevron-down', 'nav-link-arrow')}</a></li>`).join('')}
        </ul>
        ${localeHTML(locale, 'nav-locale-mobile')}
      </div>
      <div class="nav-actions">
        ${actionAnchors.map((a) => `<a class="nav-account" href="${a.getAttribute('href')}">${icon('user')}<span>${a.textContent.trim()}</span>${icon('chevron-down')}</a>`).join('')}
      </div>
    </div>`;

  // Language switcher dropdowns (desktop top bar + mobile panel).
  nav.querySelectorAll('.nav-locale').forEach((wrap) => {
    const toggle = wrap.querySelector('.nav-locale-toggle');
    toggle.addEventListener('click', () => {
      const open = wrap.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    wrap.querySelectorAll('[data-locale]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.locale !== locale) switchLocale(btn.dataset.locale);
      });
    });
  });
  document.addEventListener('click', (e) => {
    nav.querySelectorAll('.nav-locale.is-open').forEach((wrap) => {
      if (!wrap.contains(e.target)) {
        wrap.classList.remove('is-open');
        wrap.querySelector('.nav-locale-toggle').setAttribute('aria-expanded', 'false');
      }
    });
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
