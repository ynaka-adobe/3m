/**
 * header — 3M site chrome, matched to www.3m.com. Desktop renders two rows:
 * logo / search / locale on top, primary nav and the account link below.
 * Under 960px it collapses to the 3M mark, a compact search, a hamburger
 * panel and an account bar. Nav links come from a per-locale fragment
 * (/{locale}/nav) so labels and links are authored/translated in DA:
 * - section 1: list of primary nav links
 * - section 2: list of account link(s)
 * - further sections: one menu panel each, opened from the primary link whose
 *   label matches the section heading. A panel holds a list of links, an
 *   optional "view all" link paragraph, and an optional image + caption.
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
      // media paths are relative to the fragment ("./media_…"); resolve them so
      // images load on pages at any depth
      const base = new URL(path, window.location);
      dom.querySelectorAll('img[src^="./media_"], source[srcset^="./media_"]').forEach((el) => {
        const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
        el.setAttribute(attr, new URL(el.getAttribute(attr), base).href);
      });
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

// Read the menu-panel sections (3rd section onward) of the nav fragment, keyed by heading.
function parseMegaSections(sections) {
  const megas = {};
  sections.slice(2).forEach((section) => {
    const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
    const list = section.querySelector('ul');
    if (!heading || !list) return;
    const paras = [...section.querySelectorAll(':scope > p')];
    const allLink = paras.map((p) => p.querySelector(':scope > a:only-child')).find(Boolean);
    // an image that failed to import comes through as src="about:error"; skip it
    const img = section.querySelector('img');
    const picture = img && !img.getAttribute('src').startsWith('about:') ? (img.closest('picture') || img) : null;
    const caption = paras.find((p) => !p.querySelector('a, picture, img') && p.textContent.trim());
    megas[heading.textContent.trim()] = {
      links: [...list.querySelectorAll('a')],
      allLink,
      picture,
      caption: caption ? caption.textContent.trim() : '',
    };
  });
  return megas;
}

const icon = (name, cls = '') => `<img class="nav-icon nav-icon-${name} ${cls}" src="/icons/${name}.svg" alt="" aria-hidden="true">`;

function localeToggleHTML(locale, cls) {
  return `
    <div class="nav-locale ${cls}">
      <button class="nav-locale-toggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="nav-locale-popup" aria-label="Select language: ${LOCALE_LABEL[locale]}">
        <span>${LOCALE_LABEL[locale]}</span>${icon('globe')}${icon('chevron-down')}
      </button>
    </div>`;
}

function megaHTML(id, title, mega) {
  const { links, allLink, picture } = mega;
  if (picture && picture.tagName === 'IMG') picture.setAttribute('loading', 'lazy');
  else if (picture) picture.querySelectorAll('img').forEach((img) => img.setAttribute('loading', 'lazy'));
  return `
    <div class="nav-mega${picture ? ' has-feature' : ''}" id="${id}">
      <div class="nav-mega-head">
        <button class="nav-mega-back" type="button" aria-label="Back">${icon('chevron-left')}</button>
        <span>${title}</span>
      </div>
      <ul class="nav-mega-list">
        ${links.map((a) => `<li><a href="${a.getAttribute('href')}">${a.textContent.trim()}</a></li>`).join('')}
      </ul>
      ${allLink ? `<div class="nav-mega-all">
        <a href="${allLink.getAttribute('href')}">${allLink.textContent.trim()}</a>
        <button class="nav-mega-top" type="button" aria-label="Back to top">${icon('arrow-up')}</button>
      </div>` : ''}
      ${picture ? `<div class="nav-mega-feature">${picture.outerHTML}${mega.caption ? `<p>${mega.caption}</p>` : ''}</div>` : ''}
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
          <label><input type="radio" name="locale" value="${locale}" checked><span>${LANGUAGE_LABEL[locale]}</span></label>
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
  const sections = frag ? [...frag.querySelectorAll(':scope > div')] : [];
  const linksIn = (section) => (section ? [...section.querySelectorAll('a')] : []);
  const navAnchors = linksIn(sections[0]);
  const actionAnchors = linksIn(sections[1]);
  const megas = parseMegaSections(sections);

  const navItemHTML = (a, i) => {
    const label = a.textContent.trim();
    const mega = megas[label];
    const id = `nav-mega-${i}`;
    const link = `<a href="${a.getAttribute('href')}"${mega ? ` aria-haspopup="true" aria-expanded="false" aria-controls="${id}"` : ''}><span>${label}</span>${icon('chevron-down', 'nav-link-arrow')}</a>`;
    return `<li${mega ? ' class="has-mega"' : ''}>${link}${mega ? megaHTML(id, label, mega) : ''}</li>`;
  };

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
          ${navAnchors.map(navItemHTML).join('')}
        </ul>
        ${localeToggleHTML(locale, 'nav-locale-mobile')}
      </div>
      <div class="nav-actions">
        ${actionAnchors.map((a) => `<a class="nav-account" href="${a.getAttribute('href')}">${icon('user')}<span>${a.textContent.trim()}</span>${icon('chevron-down')}</a>`).join('')}
      </div>
    </div>
    <div class="nav-mega-overlay"></div>
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
  // Only the current language is listed (as on www.3m.com), so Save just confirms.
  nav.querySelector('.nav-locale-form').addEventListener('submit', (e) => {
    e.preventDefault();
    closeLocale();
  });

  // Menu panels: a dropdown under the nav on desktop, a drill-down view in the
  // hamburger panel below 960px. The primary link toggles instead of navigating.
  const panel = nav.querySelector('.nav-panel');
  const closeMegas = () => {
    nav.querySelectorAll('.nav-links > li.is-open').forEach((li) => {
      li.classList.remove('is-open');
      li.querySelector(':scope > a').setAttribute('aria-expanded', 'false');
    });
    panel.classList.remove('is-drilled');
    nav.classList.remove('is-mega-open');
  };
  nav.querySelectorAll('.nav-links > li.has-mega').forEach((li) => {
    const link = li.querySelector(':scope > a');
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const wasOpen = li.classList.contains('is-open');
      closeMegas();
      if (wasOpen) return;
      li.classList.add('is-open');
      link.setAttribute('aria-expanded', 'true');
      panel.classList.add('is-drilled');
      nav.classList.add('is-mega-open');
      panel.scrollTop = 0;
    });
    li.querySelector('.nav-mega-back').addEventListener('click', () => {
      closeMegas();
      link.focus();
    });
    const top = li.querySelector('.nav-mega-top');
    if (top) top.addEventListener('click', () => panel.scrollTo({ top: 0, behavior: 'smooth' }));
  });
  document.addEventListener('click', (e) => {
    if (window.matchMedia('(width >= 960px)').matches && !e.target.closest('.nav-links')) closeMegas();
  });
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const open = nav.querySelector('.nav-links > li.is-open > a');
    closeMegas();
    if (open) open.focus();
  });

  const burger = nav.querySelector('.nav-burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (!open) closeMegas();
  });

  block.replaceChildren(nav);

  // Load car-personalization subnav if applicable
  loadCarPersonalizationSubnav();
}
