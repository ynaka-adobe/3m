/**
 * header — 3M site chrome (self-contained for this presales build).
 * Red wordmark + primary nav + utility actions. CSS-driven mobile menu
 * toggled by a JS click handler (block JS runs, unlike fragment scripts).
 */

// Absolute local paths so the nav resolves from every page (not just home).
const NAV = [
  { label: 'Products', href: '/3m/en_us/products' },
  { label: 'Industries', href: '/3m/en_us/industries' },
  { label: 'About', href: '/3m/en_us/about-3m' },
];

const ACTIONS = [
  { label: 'Careers', href: '/3m/en_us/careers-us' },
  { label: 'Sign In', href: 'https://www.3m.com/mmm/login' },
];

export default async function decorate(block) {
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav-3m';

  nav.innerHTML = `
    <a class="nav-logo" href="/" aria-label="3M home">3M</a>
    <button class="nav-burger" type="button" aria-label="Open menu" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-panel">
      <ul class="nav-links">
        ${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
      </ul>
      <div class="nav-actions">
        ${ACTIONS.map((a) => `<a href="${a.href}">${a.label}</a>`).join('')}
        <span class="nav-locale">US&nbsp;·&nbsp;EN</span>
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
