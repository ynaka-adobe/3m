/**
 * header — 3M site chrome. Renders the red wordmark, primary nav, utility
 * actions and an EN/DE/JP language switcher. Nav links come from a per-locale
 * fragment (/{locale}/nav) so labels and links are authored/translated in DA.
 */
const LOCALES = ['en', 'de', 'jp'];
const LOCALE_LABEL = { en: 'US · EN', de: 'DE · DE', jp: 'JP · JA' };

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

const linkHTML = (a) => `<a href="${a.getAttribute('href')}">${a.textContent.trim()}</a>`;

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
  nav.innerHTML = `
    <a class="nav-logo" href="/${locale}/" aria-label="3M home">3M</a>
    <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-panel">
      <ul class="nav-links">
        ${navAnchors.map((a) => `<li>${linkHTML(a)}</li>`).join('')}
      </ul>
      <div class="nav-actions">
        ${actionAnchors.map((a) => linkHTML(a)).join('')}
        <select class="nav-locale" aria-label="Select language">
          ${LOCALES.map((l) => `<option value="${l}"${l === locale ? ' selected' : ''}>${LOCALE_LABEL[l]}</option>`).join('')}
        </select>
      </div>
    </div>`;

  // Language switcher: swap the locale segment of the current path and go there.
  const langSelect = nav.querySelector('.nav-locale');
  langSelect.addEventListener('change', () => {
    const parts = window.location.pathname.split('/');
    if (LOCALES.includes(parts[1])) {
      parts[1] = langSelect.value;
    } else {
      parts.splice(1, 0, langSelect.value);
    }
    window.location.pathname = parts.join('/') || '/';
  });

  const burger = nav.querySelector('.nav-burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  block.replaceChildren(nav);
}
