/**
 * footer — 3M site footer. Multi-column site map + social + legal, sourced from
 * a per-locale fragment (/{locale}/footer) so all copy is authored/translated
 * in DA. Fragment structure (one section each):
 *   1. tagline    a paragraph
 *   2. columns    repeated <h4> + <ul> of links
 *   3. social     a <ul> of links
 *   4. legal      a <ul> of links + a copyright paragraph
 */
const LOCALES = ['en', 'de', 'jp'];

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

async function loadFooter(locale) {
  const frag = await fetchFragment(`/${locale}/footer`);
  return frag || fetchFragment('/en/footer');
}

const anchors = (el) => (el ? [...el.querySelectorAll('a')] : []);
const linkHTML = (a) => {
  const href = a.getAttribute('href') || '#';
  const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  return `<a href="${href}"${ext}>${a.textContent.trim()}</a>`;
};

export default async function decorate(block) {
  const seg = window.location.pathname.split('/')[1];
  const locale = LOCALES.includes(seg) ? seg : 'en';

  const frag = await loadFooter(locale);
  const secs = frag ? [...frag.children] : [];
  const tagline = secs[0] ? secs[0].textContent.trim() : '';

  const cols = [];
  if (secs[1]) {
    let cur = null;
    [...secs[1].children].forEach((el) => {
      if (el.tagName === 'H4') {
        cur = { h: el.textContent.trim(), links: [] };
        cols.push(cur);
      } else if (el.tagName === 'UL' && cur) {
        cur.links = anchors(el);
      }
    });
  }
  const social = anchors(secs[2]);
  const legalLinks = anchors(secs[3] ? secs[3].querySelector('ul') : null);
  const copyEl = secs[3] ? secs[3].querySelector('p') : null;
  const copyright = copyEl ? copyEl.textContent.trim() : '';

  const f = document.createElement('div');
  f.className = 'footer-3m';

  const colsHTML = cols.map((c) => `
    <div class="footer-col">
      <h4>${c.h}</h4>
      ${c.links.map((a) => linkHTML(a)).join('')}
    </div>`).join('');

  f.innerHTML = `
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">3M</div>
        <p>${tagline}</p>
      </div>
      ${colsHTML}
    </div>
    <div class="footer-legal">
      <span>${copyright}</span>
      ${legalLinks.map((a) => linkHTML(a)).join('')}
      <span class="footer-social">${social.map((a) => linkHTML(a)).join('')}</span>
    </div>`;

  block.replaceChildren(f);
}
