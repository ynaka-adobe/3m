/**
 * header — 3M site chrome (self-contained for this presales build).
 * Red wordmark + primary nav + utility actions. CSS-driven mobile menu
 * toggled by a JS click handler (block JS runs, unlike fragment scripts).
 */

// Supported locale folders; the active one is derived from the URL so nav
// links stay within the visitor's language tree (/en, /de, …).
const LOCALES = ['en', 'de'];
const LOCALE_LABEL = { en: 'US&nbsp;·&nbsp;EN', de: 'DE&nbsp;·&nbsp;DE' };

// Internal paths are locale-relative and get prefixed with /<locale> at render
// time; absolute (http) and anchor (#) links are left untouched.
const NAV = [
  { label: 'Products', href: '/products' },
  { label: 'Industries', href: '/industries' },
  { label: 'About', href: '/about-3m' },
];

const ACTIONS = [
  { label: 'Careers', href: '/careers-us' },
  { label: 'Sign In', href: 'https://www.3m.com/mmm/login' },
];

export default async function decorate(block) {
  const seg = window.location.pathname.split('/')[1];
  const locale = LOCALES.includes(seg) ? seg : 'en';
  const localize = (href) => (href.startsWith('/') ? `/${locale}${href}` : href);

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
        ${NAV.map((n) => `<li><a href="${localize(n.href)}">${n.label}</a></li>`).join('')}
      </ul>
      <div class="nav-actions">
        ${ACTIONS.map((a) => `<a href="${localize(a.href)}">${a.label}</a>`).join('')}
        <span class="nav-locale">${LOCALE_LABEL[locale] || LOCALE_LABEL.en}</span>
      </div>
    </div>`;

  const burger = nav.querySelector('.nav-burger');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  block.replaceChildren(nav);
}
