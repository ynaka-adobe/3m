import { readBlockConfig, loadCSS } from '../../scripts/aem.js';

const LANGS = ['en', 'de', 'jp', 'fr', 'ko', 'zh'];

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function langSource(cfgSource) {
  if (cfgSource) return cfgSource;
  const seg = (window.location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const lang = LANGS.includes(seg) ? seg : 'en';
  return `/${lang}/consumer/installers.json`;
}

function matches(inst, query, service) {
  const q = query.trim().toLowerCase();
  const hitQ = !q || [inst.name, inst.city, inst.state, inst.zip]
    .some((v) => String(v).toLowerCase().includes(q));
  const hitS = service === 'All' || String(inst.services).includes(service);
  return hitQ && hitS;
}

/**
 * Build the locator UI into `root`. Shared by the block and the modal.
 * @param {Element} root container to render into
 * @param {object} opts { source, title, showExpand, onClose }
 */
async function buildLocator(root, opts) {
  const {
    source, title, showExpand, onClose,
  } = opts;
  root.textContent = '';
  root.classList.add('rs-locator');

  const header = el('div', 'rs-loc-header');
  header.append(el('h2', 'rs-loc-title', title));
  if (showExpand) {
    const expand = el('button', 'rs-loc-expand', '⤢ Full screen');
    expand.type = 'button';
    expand.onclick = () => {
      root.classList.add('rs-locator-takeover');
      document.body.classList.add('rs-locator-lock');
    };
    header.append(expand);
  }

  const toolbar = el('div', 'rs-loc-toolbar');
  const search = el('input', 'rs-loc-search');
  search.type = 'search';
  search.placeholder = 'City, state, or ZIP';
  search.setAttribute('aria-label', 'Search installers by city, state, or ZIP');
  const filters = el('div', 'rs-loc-filters');
  toolbar.append(search, filters);

  const body = el('div', 'rs-loc-body');
  const map = el('div', 'rs-loc-map');
  const list = el('ul', 'rs-loc-list');
  body.append(map, list);

  const close = el('button', 'rs-loc-close', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Close full screen');
  close.onclick = () => {
    if (onClose) onClose();
    else {
      root.classList.remove('rs-locator-takeover');
      document.body.classList.remove('rs-locator-lock');
    }
  };

  root.append(close, header, toolbar, body);

  let installers = [];
  try {
    let res = await fetch(source);
    if (!res.ok) res = await fetch('/installers.json');
    const json = await res.json();
    installers = (json.data || json).map((d, i) => ({ ...d, id: i }));
  } catch (e) {
    list.textContent = 'Could not load installers.';
    return;
  }

  const services = ['All', 'Wrap Film', 'Window Tint', 'PPF'];
  let activeService = 'All';
  let query = '';
  let selectedId = null;

  function selectInstaller(id) {
    selectedId = id;
    list.querySelectorAll('.rs-loc-card').forEach((c) => {
      c.classList.toggle('is-active', Number(c.dataset.id) === id);
    });
    map.querySelectorAll('.rs-loc-pin').forEach((p) => {
      p.classList.toggle('is-active', Number(p.dataset.id) === id);
    });
    const card = list.querySelector(`.rs-loc-card[data-id="${id}"]`);
    if (card) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function render() {
    const shown = installers.filter((inst) => matches(inst, query, activeService));

    map.textContent = '';
    shown.forEach((inst) => {
      const pin = el('button', 'rs-loc-pin');
      pin.type = 'button';
      pin.dataset.id = inst.id;
      pin.style.left = `${inst.x}%`;
      pin.style.top = `${inst.y}%`;
      pin.title = inst.name;
      pin.setAttribute('aria-label', inst.name);
      pin.onclick = () => selectInstaller(inst.id);
      map.append(pin);
    });

    list.textContent = '';
    if (!shown.length) {
      list.append(el('li', 'rs-loc-empty', 'No installers match your search.'));
    }
    shown.forEach((inst) => {
      const card = el('li', 'rs-loc-card');
      card.dataset.id = inst.id;
      card.innerHTML = `
        <div class="rs-loc-card-head">
          <strong>${inst.name}</strong>
          <span class="rs-loc-dist">${inst.distance} mi</span>
        </div>
        <p class="rs-loc-addr">${inst.address}, ${inst.city}, ${inst.state} ${inst.zip}</p>
        <p class="rs-loc-svc">${inst.services}</p>
        <a class="rs-loc-phone" href="tel:${inst.phone.replace(/[^0-9]/g, '')}">${inst.phone}</a>`;
      card.onclick = () => selectInstaller(inst.id);
      list.append(card);
    });

    if (selectedId !== null && shown.some((i) => i.id === selectedId)) {
      selectInstaller(selectedId);
    }
  }

  services.forEach((s) => {
    const b = el('button', `rs-loc-chip${s === activeService ? ' is-active' : ''}`, s);
    b.type = 'button';
    b.onclick = () => {
      activeService = s;
      filters.querySelectorAll('.rs-loc-chip').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      render();
    };
    filters.append(b);
  });

  search.addEventListener('input', () => { query = search.value; render(); });

  // Esc closes the takeover (block-inline path; the modal wires its own too)
  if (showExpand) {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && root.classList.contains('rs-locator-takeover')) close.click();
    });
  }

  render();
}

/**
 * Open the locator as a full-screen takeover modal, created on demand.
 * Usable from any block (e.g. the visualizer's "Find an installer" CTA).
 */
export async function openLocatorModal({ source, title } = {}) {
  await loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/locator/locator.css`);
  const overlay = el('div', 'rs-locator rs-locator-takeover');
  document.body.append(overlay);
  document.body.classList.add('rs-locator-lock');

  function close() {
    overlay.remove();
    document.body.classList.remove('rs-locator-lock');
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);

  await buildLocator(overlay, {
    source: langSource(source),
    title: title || 'Find an installer',
    showExpand: false,
    onClose: close,
  });
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  await buildLocator(block, {
    source: langSource(cfg.source),
    title: cfg.title || 'Find an installer',
    showExpand: true,
  });
}
