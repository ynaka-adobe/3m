/**
 * breadcrumb — ancestor trail for deep L2/L3 pages. By default the trail is
 * derived from the current URL path, so authors drop the block in and it just
 * works; any segment can be relabelled or hidden by authoring a row.
 *
 * Variants via block class:
 *   breadcrumb compact    tighter type, no top rule
 *
 * Authoring (optional — all rows are overrides):
 *   1. path segment   the URL segment to relabel, e.g. "industrial-tapes"
 *                     or the literal "home" to rename the root crumb
 *   2. label          the text to show instead of the derived title
 *
 * A row whose label is blank removes that segment from the trail.
 */
const HOME_LABEL = 'Home';

function titleCase(segment) {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\.(html?|plain\.html)$/i, '')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function decorate(block) {
  // author overrides: segment -> label ("" means drop the crumb)
  const overrides = new Map();
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const key = cells[0].textContent.trim().toLowerCase();
    if (!key) return;
    overrides.set(key, cells[1] ? cells[1].textContent.trim() : '');
  });

  const segments = window.location.pathname.split('/').filter(Boolean);

  const crumbs = [];
  const homeLabel = overrides.has('home') ? overrides.get('home') : HOME_LABEL;
  if (homeLabel) crumbs.push({ label: homeLabel, href: '/' });

  let path = '';
  segments.forEach((seg, i) => {
    path += `/${seg}`;
    const key = seg.toLowerCase();
    if (overrides.has(key) && !overrides.get(key)) return;
    const label = overrides.get(key) || titleCase(seg);
    if (!label) return;
    crumbs.push({ label, href: path, current: i === segments.length - 1 });
  });

  if (crumbs.length < 2) {
    // nothing meaningful to show (e.g. the home page itself)
    block.replaceChildren();
    return;
  }

  const nav = document.createElement('nav');
  nav.className = 'breadcrumb-nav';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  crumbs.forEach((crumb) => {
    const li = document.createElement('li');
    if (crumb.current) {
      const span = document.createElement('span');
      span.textContent = crumb.label;
      span.setAttribute('aria-current', 'page');
      li.append(span);
    } else {
      const a = document.createElement('a');
      a.href = crumb.href;
      a.textContent = crumb.label;
      li.append(a);
    }
    ol.append(li);
  });

  nav.append(ol);
  block.replaceChildren(nav);
}
