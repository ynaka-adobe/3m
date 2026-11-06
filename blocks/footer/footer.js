import { decorateIcons } from '../../scripts/aem.js';

/**
 * footer — 3M site footer, sourced from a per-locale fragment (/{locale}/footer)
 * so all copy is authored/translated in DA. Fragment structure (one section each):
 *   1. categories  repeated heading + <ul> of links
 *   2. legal       a <p> with the logo link, a <ul> of legal links, a copyright <p>
 *   3. social      a heading, a <ul> of icon links, a disclosure <p>
 * Links to `#cookie-preferences` reopen the consent dialog.
 */
const LOCALES = ['en', 'de', 'jp'];
const CONSENT_HASH = '#cookie-preferences';
const tablet = window.matchMedia('(width >= 768px)');

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

/** local dev (aem up --html-folder content) serves the workspace copy under /content */
const LOCAL_DEV = ['localhost', '127.0.0.1'].includes(window.location.hostname);

async function loadFragment(locale) {
  const paths = [`/${locale}/footer`, '/en/footer'];
  const candidates = LOCAL_DEV ? paths.flatMap((p) => [`/content${p}`, p]) : paths;
  for (let i = 0; i < candidates.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const frag = await fetchFragment(candidates[i]);
    if (frag) return frag;
  }
  return null;
}

function el(tag, className, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.append(...children);
  return node;
}

/** moves the text of a link into a visually hidden span, keeping it accessible */
function hideLabel(a) {
  [...a.childNodes].forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE && n.textContent.trim()) {
      a.replaceChild(el('span', 'footer-sr-only', [n.textContent.trim()]), n);
    }
  });
}

function wireConsent(a) {
  if (a.getAttribute('href') !== CONSENT_HASH) return;
  a.dataset.consentReopen = '';
  a.addEventListener('click', async (e) => {
    e.preventDefault();
    const { openConsent } = await import('../../scripts/consent.js');
    openConsent({ mode: 'preferences' });
  });
}

function buildCategories(section) {
  const list = el('ul', 'footer-categories');
  if (!section) return list;
  let links = null;
  [...section.children].forEach((child) => {
    if (/^H[1-6]$/.test(child.tagName)) {
      const id = `footer-category-${list.children.length}`;
      const button = el('button', 'footer-category-toggle', [child.textContent.trim()]);
      button.type = 'button';
      button.setAttribute('aria-controls', id);
      links = el('ul', 'footer-category-links');
      links.id = id;
      button.addEventListener('click', () => {
        if (tablet.matches) return;
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', open);
        button.parentElement.classList.toggle('is-open', open);
      });
      list.append(el('li', 'footer-category', [el('h2', 'footer-category-heading', [button]), links]));
    } else if (child.tagName === 'UL' && links) {
      links.append(...[...child.children].map((li) => {
        li.className = 'footer-category-link';
        return li;
      }));
    }
  });
  return list;
}

function buildLegal(section) {
  const row = el('div', 'footer-legal-row');
  if (!section) return row;
  const logo = section.querySelector('p a');
  if (logo) {
    hideLabel(logo);
    row.append(el('div', 'footer-logo', [logo]));
  }
  const legal = el('div', 'footer-legal');
  [...section.querySelectorAll('ul a')].forEach((a, i) => {
    if (i) {
      const sep = el('span', 'footer-legal-sep', ['|']);
      sep.setAttribute('aria-hidden', 'true');
      legal.append(sep);
    }
    a.className = 'footer-legal-link';
    if (a.querySelector('.icon')) a.classList.add('footer-legal-link-icon');
    wireConsent(a);
    legal.append(a);
  });
  const copy = [...section.querySelectorAll(':scope > p')]
    .find((p) => !p.querySelector('a') && p.textContent.trim());
  const text = el('div', 'footer-legal-text', [legal]);
  if (copy) text.append(el('p', 'footer-copyright', [copy.textContent.trim()]));
  row.append(text);
  return row;
}

function buildSocial(section) {
  const col = el('div', 'footer-social');
  if (!section) return col;
  const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) col.append(el('h2', 'footer-social-heading', [heading.textContent.trim()]));
  const list = el('ul', 'footer-social-links');
  section.querySelectorAll('ul a').forEach((a) => {
    a.className = 'footer-social-link';
    a.title = a.textContent.trim();
    a.target = '_blank';
    a.rel = 'noopener';
    hideLabel(a);
    a.append(el('span', 'footer-social-ring'));
    list.append(el('li', '', [a]));
  });
  col.append(list);
  const note = [...section.querySelectorAll(':scope > p')].pop();
  if (note) col.append(el('p', 'footer-disclosure', [note.textContent.trim()]));
  return col;
}

function syncToggles(block) {
  block.querySelectorAll('.footer-category-toggle').forEach((button) => {
    if (tablet.matches) {
      button.removeAttribute('aria-expanded');
      button.tabIndex = -1;
    } else {
      button.setAttribute('aria-expanded', button.parentElement.classList.contains('is-open'));
      button.removeAttribute('tabindex');
    }
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const seg = window.location.pathname.split('/')[1];
  const locale = LOCALES.includes(seg) ? seg : 'en';

  const frag = await loadFragment(locale);
  const [categories, legal, social] = frag ? [...frag.children] : [];

  const footer = el('div', 'footer-inner', [
    buildCategories(categories),
    buildLegal(legal),
    buildSocial(social),
  ]);
  decorateIcons(footer);
  block.replaceChildren(footer);

  syncToggles(block);
  tablet.addEventListener('change', () => syncToggles(block));
}
