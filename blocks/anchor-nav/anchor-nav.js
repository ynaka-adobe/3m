/**
 * anchor-nav — "On this page" in-page navigation with scroll-spy. Headings are
 * collected from the page automatically, so the nav never drifts out of sync
 * with the content.
 *
 * Variants via block class:
 *   anchor-nav tabs      horizontal underline tab bar (the rMDS tab link bar)
 *   anchor-nav sticky    pins to the top of the viewport while in range
 *   anchor-nav h3        also index h3s (default: h2 only)
 *
 * Authoring (optional):
 *   1. label   a title for the nav, e.g. "On this page". Omit for no title.
 *
 * Any row containing links is treated as a manual override: those links are
 * used verbatim instead of the auto-collected headings.
 */
function slug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function collectHeadings(block) {
  const main = block.closest('main') || document.querySelector('main');
  if (!main) return [];
  const sel = block.classList.contains('h3') ? 'h2, h3' : 'h2';
  const all = [...main.querySelectorAll(sel)]
    .filter((h) => !block.contains(h) && h.textContent.trim());
  // section headings are authored as default content; headings *inside* another
  // block are part of that block's copy, not page structure
  const structural = all.filter((h) => !h.closest('.block'));
  return (structural.length ? structural : all).map((h) => {
    if (!h.id) h.id = slug(h.textContent).slice(0, 48);
    return { id: h.id, label: h.textContent.trim(), el: h };
  });
}

function spy(links, targets) {
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const visible = new Set();

  const setActive = () => {
    // the topmost visible heading wins
    const first = targets.find((t) => visible.has(t.id));
    links.forEach((a) => {
      const on = first && a.getAttribute('href') === `#${first.id}`;
      a.classList.toggle('is-active', !!on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    });
    setActive();
  }, { rootMargin: '-80px 0px -70% 0px', threshold: 0 });

  targets.forEach((t) => {
    if (byId.has(t.id)) io.observe(t.el);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const manual = rows.find((r) => r.querySelector('a'));
  const labelRow = rows.find((r) => r !== manual && r.textContent.trim());
  const label = labelRow ? labelRow.textContent.trim() : '';

  const nav = document.createElement('nav');
  nav.className = 'an-nav';
  nav.setAttribute('aria-label', label || 'On this page');

  if (label) {
    const h = document.createElement('p');
    h.className = 'an-label';
    h.textContent = label;
    nav.append(h);
  }

  const ul = document.createElement('ul');
  ul.className = 'an-list';
  const links = [];
  let targets = [];

  if (manual) {
    [...manual.querySelectorAll('a')].forEach((a) => {
      const li = document.createElement('li');
      a.classList.add('an-link');
      li.append(a);
      ul.append(li);
      links.push(a);
    });
    const main = block.closest('main') || document;
    targets = links
      .map((a) => {
        const id = a.getAttribute('href') || '';
        if (!id.startsWith('#')) return null;
        const el = main.querySelector(`#${CSS.escape(id.slice(1))}`);
        return el ? { id: id.slice(1), el } : null;
      })
      .filter(Boolean);
  } else {
    targets = collectHeadings(block);
    targets.forEach((t) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'an-link';
      a.href = `#${t.id}`;
      a.textContent = t.label;
      li.append(a);
      ul.append(li);
      links.push(a);
    });
  }

  if (!ul.children.length) {
    block.replaceChildren();
    return;
  }

  nav.append(ul);
  block.replaceChildren(nav);

  if (block.classList.contains('sticky')) {
    block.closest('.anchor-nav-wrapper')?.classList.add('is-sticky');
  }

  spy(links, targets);
}
