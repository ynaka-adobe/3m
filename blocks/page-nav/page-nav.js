/**
 * page-nav — L2 page masthead: the page title plus a section navigation bar
 * that pins to the top of the viewport as you scroll. Groups with more than
 * one link become dropdown menus.
 *
 * Variants via block class:
 *   page-nav light    sit on the light ground
 *
 * Authoring:
 *   row 1        page title (heading or plain text). An optional second cell
 *                holds a short standfirst.
 *   rows 2..n    1. label   group name. If the cell itself contains a single
 *                           link the group becomes a plain link, not a menu.
 *                2. links   a bullet list of links — rendered as a dropdown
 */
function closeAll(root, except) {
  root.querySelectorAll('.pn-group.is-open').forEach((g) => {
    if (g === except) return;
    g.classList.remove('is-open');
    g.querySelector('.pn-trigger')?.setAttribute('aria-expanded', 'false');
  });
}

function buildMenu(group, label, links, index) {
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'pn-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.id = `pn-trigger-${index}`;

  const text = document.createElement('span');
  text.textContent = label;
  trigger.append(text);

  const caret = document.createElement('span');
  caret.className = 'pn-caret';
  caret.setAttribute('aria-hidden', 'true');
  trigger.append(caret);

  const menu = document.createElement('ul');
  menu.className = 'pn-menu';
  menu.setAttribute('aria-labelledby', trigger.id);

  links.forEach((a) => {
    const li = document.createElement('li');
    li.append(a);
    menu.append(li);
  });

  trigger.addEventListener('click', () => {
    const open = group.classList.toggle('is-open');
    trigger.setAttribute('aria-expanded', String(open));
    closeAll(group.closest('.pn-nav'), group);
  });

  group.append(trigger, menu);
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'pn-inner';

  const titleRow = rows[0];
  const titleCells = [...titleRow.children];
  const heading = titleRow.querySelector('h1, h2, h3, h4, h5, h6');

  const head = document.createElement('div');
  head.className = 'pn-head';

  const h = document.createElement('h1');
  h.className = 'pn-title';
  if (heading) h.append(...heading.childNodes);
  else h.textContent = titleCells[0]?.textContent.trim() || '';
  head.append(h);

  const standfirst = titleCells[1]?.textContent.trim();
  if (standfirst) {
    const p = document.createElement('p');
    p.className = 'pn-standfirst';
    p.textContent = standfirst;
    head.append(p);
  }
  wrap.append(head);

  const groups = rows.slice(1).filter((r) => r.querySelector('a'));
  if (groups.length) {
    const nav = document.createElement('nav');
    nav.className = 'pn-nav';
    nav.setAttribute('aria-label', 'Section navigation');

    const list = document.createElement('ul');
    list.className = 'pn-groups';

    groups.forEach((row, i) => {
      const cells = [...row.children];
      const links = [...row.querySelectorAll('a')];
      const label = cells[0]?.textContent.trim() || links[0]?.textContent.trim() || '';

      const li = document.createElement('li');
      li.className = 'pn-group';

      const isMenu = links.length > 1 || (links.length === 1 && !cells[0]?.contains(links[0]));
      if (isMenu) {
        buildMenu(li, label, links, i);
      } else if (links[0]) {
        links[0].className = 'pn-link';
        li.append(links[0]);
      }
      list.append(li);
    });

    nav.append(list);
    wrap.append(nav);

    document.addEventListener('click', (e) => {
      if (!nav.contains(e.target)) closeAll(nav);
    });
    nav.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = nav.querySelector('.pn-group.is-open .pn-trigger');
        closeAll(nav);
        open?.focus();
      }
    });
  }

  block.replaceChildren(wrap);

  // pin the bar once the title scrolls past
  const wrapper = block.closest('.page-nav-wrapper') || block;
  if ('IntersectionObserver' in window) {
    const sentinel = document.createElement('div');
    sentinel.className = 'pn-sentinel';
    wrapper.before(sentinel);
    const io = new IntersectionObserver(([entry]) => {
      block.classList.toggle('is-pinned', !entry.isIntersecting);
    }, { threshold: 0 });
    io.observe(sentinel);
  }
}
