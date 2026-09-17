import { readBlockConfig } from '../../scripts/aem.js';

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function matches(inst, query, service) {
  const q = query.trim().toLowerCase();
  const hitQ = !q || [inst.name, inst.city, inst.state, inst.zip]
    .some((v) => String(v).toLowerCase().includes(q));
  const hitS = service === 'All' || String(inst.services).includes(service);
  return hitQ && hitS;
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const source = cfg.source || '/installers.json';
  const title = cfg.title || 'Find an installer';

  block.textContent = '';
  block.classList.add('rs-locator');

  // ---- chrome ----
  const header = el('div', 'rs-loc-header');
  header.append(el('h2', 'rs-loc-title', title));
  const expand = el('button', 'rs-loc-expand', '⤢ Full screen');
  expand.type = 'button';
  header.append(expand);

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

  block.append(close, header, toolbar, body);

  // ---- data ----
  let installers = [];
  try {
    const res = await fetch(source);
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

  // ---- takeover modal ----
  function closeTakeover() {
    block.classList.remove('rs-locator-takeover');
    document.body.classList.remove('rs-locator-lock');
  }
  function openTakeover() {
    block.classList.add('rs-locator-takeover');
    document.body.classList.add('rs-locator-lock');
    close.focus();
  }
  expand.onclick = openTakeover;
  close.onclick = closeTakeover;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && block.classList.contains('rs-locator-takeover')) closeTakeover();
  });

  render();
}
