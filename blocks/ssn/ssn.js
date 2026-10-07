/**
 * ssn — MDS "Site Sub-Navigation": breadcrumb trail, L2 site title, and a
 * tab row of section links (tabs with a nested list open as dropdowns).
 *
 * Authoring (one cell per row, in order):
 *   1. breadcrumb        list (or paragraphs) of links; trailing plain text
 *                        is the current page
 *   2. L2 site title     plain text or a link to the L2 home
 *   3. tabs              list of links; a nested list under an item becomes
 *                        that tab's dropdown. The tab linking to the current
 *                        page is active, else a bold tab label, else the
 *                        first tab.
 */
let uid = 0;

function buildBreadcrumb(cell) {
  const nav = document.createElement('nav');
  nav.className = 'ssn-breadcrumb';
  nav.setAttribute('aria-label', 'Breadcrumb');
  const ol = document.createElement('ol');

  const items = cell.querySelectorAll('li').length
    ? [...cell.querySelectorAll('li')].map((li) => li.querySelector('a') || li.textContent.trim())
    : [...cell.querySelectorAll('a')];
  // a trailing text node after the last link is the current page
  const trailing = cell.textContent.trim().split(/\s*[>›]\s*/).pop();
  if (!cell.querySelectorAll('li').length && trailing
    && ![...cell.querySelectorAll('a')].some((a) => a.textContent.trim() === trailing)) {
    items.push(trailing);
  }

  items.forEach((item, i) => {
    const li = document.createElement('li');
    if (typeof item === 'string') {
      li.textContent = item;
      if (i === items.length - 1) li.setAttribute('aria-current', 'page');
    } else {
      li.append(item);
    }
    ol.append(li);
  });
  nav.append(ol);
  return nav;
}

function closeAll(nav, except) {
  nav.querySelectorAll('.ssn-tab-toggle[aria-expanded="true"]').forEach((btn) => {
    if (btn !== except) btn.setAttribute('aria-expanded', 'false');
  });
}

function buildTabs(cell) {
  const nav = document.createElement('nav');
  nav.className = 'ssn-tabs';
  nav.setAttribute('aria-label', 'Section');
  const ul = document.createElement('ul');
  const source = cell.querySelector('ul');
  if (!source) return nav;

  const items = [...source.children];
  // own link of a tab = first link outside its nested dropdown list
  const ownLink = (li) => [...li.querySelectorAll('a')].find((a) => !a.closest('li ul'));
  const path = window.location.pathname.replace(/\.html$/, '');
  let activeIndex = items.findIndex((li) => {
    const a = ownLink(li);
    // in-page anchors (#section) point at this page but don't mark a tab
    return a && !a.getAttribute('href').startsWith('#')
      && new URL(a.href, window.location).pathname.replace(/\.html$/, '') === path;
  });
  // else an author-bolded tab label (e.g. the dropdown this page lives under)
  if (activeIndex < 0) {
    activeIndex = Math.max(0, items.findIndex((li) => li.querySelector(':scope > strong, :scope > p > strong')));
  }

  items.forEach((srcLi, i) => {
    const li = document.createElement('li');
    li.className = 'ssn-tab';
    if (i === activeIndex) li.classList.add('active');
    const sub = srcLi.querySelector(':scope > ul');
    const link = ownLink(srcLi);
    const label = link ? link.textContent.trim()
      : [...srcLi.childNodes].filter((n) => n !== sub).map((n) => n.textContent).join('').trim();

    if (sub) {
      uid += 1;
      const id = `ssn-menu-${uid}`;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ssn-tab-toggle';
      btn.textContent = label;
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', id);
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        closeAll(nav, btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
      sub.id = id;
      sub.className = 'ssn-menu';
      li.append(btn, sub);
    } else if (link) {
      link.className = 'ssn-tab-link';
      link.removeAttribute('title');
      if (i === activeIndex) link.setAttribute('aria-current', 'page');
      li.append(link);
    } else {
      li.textContent = label;
    }
    ul.append(li);
  });

  nav.append(ul);
  nav.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll(nav);
  });
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAll(nav);
  });
  return nav;
}

export default function decorate(block) {
  const [crumbRow, titleRow, tabsRow] = [...block.children].map((row) => row.firstElementChild);

  const parts = [];
  if (crumbRow) parts.push(buildBreadcrumb(crumbRow));
  if (titleRow && titleRow.textContent.trim()) {
    const title = document.createElement('p');
    title.className = 'ssn-title';
    const link = titleRow.querySelector('a');
    if (link) title.append(link);
    else title.textContent = titleRow.textContent.trim();
    parts.push(title);
  }
  if (tabsRow) parts.push(buildTabs(tabsRow));

  block.replaceChildren(...parts);
}
