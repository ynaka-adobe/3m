/**
 * resource-list — downloadable document library (data sheets, SDS, guides).
 * File type and size are shown as metadata; long lists paginate behind a
 * "Show more" control so the page stays light.
 *
 * Variants via block class:
 *   resource-list compact   denser rows, no description
 *
 * Authoring — two modes.
 *
 * (a) Authored rows, one per resource:
 *   1. link          <a> to the asset; its text is the resource title
 *   2. type          "PDF", "XLSX"… (optional — derived from the href if blank)
 *   3. size          "1.2 MB" (optional)
 *   4. description   supporting copy (optional)
 *
 * (b) Indexed, driven by a query-index sheet. Author a config row:
 *   source   /resources/query-index.json
 *   show     6            items per page (default 6)
 *   filter   category=sds optional key=value match against the index rows
 */
const CONFIG_KEYS = ['source', 'show', 'filter'];
const EXT = /\.([a-z0-9]{2,5})(\?|$)/i;
const DEFAULT_SHOW = 6;

function typeFromHref(href) {
  const m = EXT.exec(href || '');
  return m ? m[1].toUpperCase() : '';
}

function formatSize(bytes) {
  const n = Number(bytes);
  if (!n || Number.isNaN(n)) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function readConfig(block) {
  const config = {};
  const consumed = new Set();
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length !== 2 || row.querySelector('a, img, picture')) return;
    const key = cells[0].textContent.trim().toLowerCase();
    if (CONFIG_KEYS.includes(key)) {
      config[key] = cells[1].textContent.trim();
      consumed.add(row);
    }
  });
  return { config, consumed };
}

function itemFromRow(row) {
  const cells = [...row.children];
  const a = row.querySelector('a');
  if (!a) return null;
  const href = a.getAttribute('href') || '';
  const rest = cells
    .filter((c) => !c.contains(a))
    .map((c) => c.textContent.trim())
    .filter(Boolean);
  return {
    title: a.textContent.trim(),
    href,
    type: rest[0] || typeFromHref(href),
    size: rest[1] || '',
    description: rest[2] || '',
  };
}

function itemFromIndex(entry) {
  const href = entry.path || entry.url || entry.href || '';
  return {
    title: entry.title || entry.name || href,
    href,
    type: entry.type || typeFromHref(href),
    size: entry.size && /^\d+$/.test(String(entry.size))
      ? formatSize(entry.size) : (entry.size || ''),
    description: entry.description || '',
  };
}

async function loadIndex(config) {
  try {
    const resp = await fetch(config.source);
    if (!resp.ok) return [];
    const json = await resp.json();
    let data = json.data || json;
    if (!Array.isArray(data)) return [];
    if (config.filter && config.filter.includes('=')) {
      const [key, value] = config.filter.split('=').map((s) => s.trim());
      data = data.filter((d) => String(d[key] || '').toLowerCase() === value.toLowerCase());
    }
    return data.map(itemFromIndex);
  } catch (e) {
    return [];
  }
}

function renderItem(item) {
  const li = document.createElement('li');
  li.className = 'rl-item';

  const a = document.createElement('a');
  a.className = 'rl-link';
  a.href = item.href;

  const main = document.createElement('span');
  main.className = 'rl-main';

  const title = document.createElement('span');
  title.className = 'rl-title';
  title.textContent = item.title;
  main.append(title);

  if (item.description) {
    const desc = document.createElement('span');
    desc.className = 'rl-desc';
    desc.textContent = item.description;
    main.append(desc);
  }
  a.append(main);

  const meta = document.createElement('span');
  meta.className = 'rl-meta';
  const bits = [item.type, item.size].filter(Boolean);
  if (bits.length) {
    meta.textContent = bits.join(' · ');
    // the visual meta is decorative detail; give AT the full phrase
    a.setAttribute('aria-label', `${item.title} (${bits.join(', ')})`);
  }
  a.append(meta);

  li.append(a);
  return li;
}

export default async function decorate(block) {
  const { config, consumed } = readConfig(block);
  const perPage = Math.max(1, parseInt(config.show, 10) || DEFAULT_SHOW);

  let items = [...block.children]
    .filter((row) => !consumed.has(row))
    .map(itemFromRow)
    .filter(Boolean);

  if (config.source) items = await loadIndex(config);

  const ul = document.createElement('ul');
  ul.className = 'rl-items';

  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'button secondary rl-more';
  more.textContent = 'Show more';

  const status = document.createElement('p');
  status.className = 'rl-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  let shown = 0;
  const showNext = () => {
    const next = items.slice(shown, shown + perPage);
    next.forEach((item) => ul.append(renderItem(item)));
    shown += next.length;
    status.textContent = `Showing ${shown} of ${items.length}`;
    more.hidden = shown >= items.length;
    // move focus to the first newly revealed row so keyboard users keep place
    if (shown > next.length && next.length) {
      ul.children[shown - next.length]?.querySelector('a')?.focus();
    }
  };

  more.addEventListener('click', showNext);

  block.replaceChildren(ul);
  if (items.length) {
    block.append(status, more);
    showNext();
  }
}
