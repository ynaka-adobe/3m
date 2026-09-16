import { readBlockConfig } from '../../scripts/aem.js';

// Side-profile car built from panels so a wrap can be applied per-surface.
// Swap this SVG for masked vehicle photos later without touching the logic below.
const CAR_SVG = `
<svg class="rs-car" viewBox="0 0 640 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Vehicle preview">
  <defs>
    <linearGradient id="rs-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/>
      <stop offset="0.35" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="0.55" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0.28"/>
    </linearGradient>
    <pattern id="rs-carbon" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#000" fill-opacity="0.001"/>
      <rect width="5" height="5" fill="#000" fill-opacity="0.28"/>
      <rect x="5" y="5" width="5" height="5" fill="#000" fill-opacity="0.28"/>
    </pattern>
  </defs>
  <ellipse class="rs-shadow" cx="320" cy="232" rx="250" ry="16"/>
  <!-- windows / glass -->
  <path class="rs-glass" d="M188 96 L246 58 L392 58 L432 96 Z"/>
  <!-- main body: this is the panel that takes the wrap -->
  <path class="rs-panel" d="M40 168 C40 150 60 146 92 144 L150 110 C170 96 196 90 232 90 L404 90 C448 90 476 104 500 132 L560 150 C596 156 604 168 600 186 L596 200 L44 200 Z"/>
  <!-- finish overlay sits on top of the same silhouette -->
  <path class="rs-finish" d="M40 168 C40 150 60 146 92 144 L150 110 C170 96 196 90 232 90 L404 90 C448 90 476 104 500 132 L560 150 C596 156 604 168 600 186 L596 200 L44 200 Z"/>
  <!-- wheels -->
  <circle class="rs-tire" cx="164" cy="200" r="42"/><circle class="rs-rim" cx="164" cy="200" r="20"/>
  <circle class="rs-tire" cx="476" cy="200" r="42"/><circle class="rs-rim" cx="476" cy="200" r="20"/>
</svg>`;

const FINISH_HINT = {
  Gloss: 'High-shine mirror finish.',
  Matte: 'Flat, non-reflective look.',
  Satin: 'Soft sheen between matte and gloss.',
  Metallic: 'Metal-flake depth that shifts in light.',
  ColorFlip: 'Color-shifting flip depending on angle.',
  Brushed: 'Brushed-metal texture.',
  Textured: 'Carbon-fiber texture.',
  Tint: 'Applies to the glass, not the body.',
  Clear: 'Invisible protection with a subtle sheen.',
};

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function applyFilm(stage, film, view) {
  const svg = stage.querySelector('.rs-car');
  const panel = svg.querySelector('.rs-panel');
  const finish = svg.querySelector('.rs-finish');
  const glass = svg.querySelector('.rs-glass');
  svg.dataset.view = view;

  // reset
  finish.setAttribute('fill', 'url(#rs-sheen)');
  finish.style.opacity = '';
  glass.setAttribute('fill', '#243447');
  glass.style.opacity = '0.9';

  if (film.product === 'Window Tint') {
    glass.setAttribute('fill', film.color);
    glass.style.opacity = '0.92';
    return;
  }
  if (film.product === 'Paint Protection Film') {
    // PPF keeps the paint; matte PPF knocks back the sheen.
    finish.style.opacity = film.finish === 'Matte' ? '0.15' : '0.7';
    return;
  }

  panel.setAttribute('fill', film.color);
  const map = {
    Gloss: 0.9, Metallic: 0.85, ColorFlip: 0.85, Satin: 0.5,
    Brushed: 0.4, Matte: 0.18, Textured: 0.6,
  };
  finish.style.opacity = String(map[film.finish] ?? 0.6);
  if (film.finish === 'Textured') finish.setAttribute('fill', 'url(#rs-carbon)');
  if (film.finish === 'Metallic' || film.finish === 'ColorFlip') {
    finish.setAttribute('fill', 'url(#rs-sheen)');
  }
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const source = cfg.source || '/films.json';
  const title = cfg.title || '3M Restyling Studio Visualizer';

  block.textContent = '';
  block.classList.add('rs-visualizer');

  // ---- layout ----
  const stage = el('div', 'rs-stage', CAR_SVG);
  const viewbar = el('div', 'rs-viewbar');
  ['Side', 'Front', 'Rear'].forEach((v, i) => {
    const b = el('button', 'rs-view' + (i === 0 ? ' is-active' : ''), v);
    b.type = 'button';
    b.dataset.view = v.toLowerCase();
    viewbar.append(b);
  });
  const caption = el('div', 'rs-caption', 'Select a film to preview');

  const panel = el('aside', 'rs-panel-ui');
  panel.append(el('h2', 'rs-title', title));
  const productTabs = el('div', 'rs-tabs');
  const finishRow = el('div', 'rs-filters');
  const grid = el('div', 'rs-grid');
  const detail = el('div', 'rs-detail');
  const cta = el('a', 'rs-cta button', 'Find an installer');
  cta.href = cfg.installer || 'https://www.3m.com/3M/en_US/car-personalization-us/where-to-buy/';
  cta.target = '_blank';
  cta.rel = 'noopener';
  panel.append(productTabs, finishRow, grid, detail, cta);

  const stageWrap = el('div', 'rs-stagewrap');
  stageWrap.append(stage, viewbar, caption);
  block.append(stageWrap, panel);

  // ---- data ----
  let films = [];
  try {
    const res = await fetch(source);
    const json = await res.json();
    films = json.data || json;
  } catch (e) {
    grid.textContent = 'Could not load the film catalog.';
    return;
  }

  const products = [...new Set(films.map((f) => f.product))];
  let activeProduct = products[0];
  let activeFinish = 'All';
  let activeView = 'side';
  let selected = null;

  function finishesFor(product) {
    return ['All', ...new Set(films.filter((f) => f.product === product).map((f) => f.finish))];
  }

  function renderTabs() {
    productTabs.textContent = '';
    products.forEach((p) => {
      const b = el('button', 'rs-tab' + (p === activeProduct ? ' is-active' : ''), p);
      b.type = 'button';
      b.onclick = () => { activeProduct = p; activeFinish = 'All'; renderAll(); };
      productTabs.append(b);
    });
  }

  function renderFinishes() {
    finishRow.textContent = '';
    finishesFor(activeProduct).forEach((f) => {
      const b = el('button', 'rs-chip' + (f === activeFinish ? ' is-active' : ''), f);
      b.type = 'button';
      b.onclick = () => { activeFinish = f; renderGrid(); };
      finishRow.append(b);
    });
  }

  function select(film) {
    selected = film;
    applyFilm(stage, film, activeView);
    caption.textContent = `${film.product} · ${film.series}`;
    detail.innerHTML = `
      <div class="rs-swatch-lg" style="background:${film.color}"></div>
      <div>
        <strong>${film.name}</strong>
        <span class="rs-sku">${film.id}</span>
        <p>${FINISH_HINT[film.finish] || ''}</p>
      </div>`;
    grid.querySelectorAll('.rs-swatch').forEach((s) => {
      s.classList.toggle('is-active', s.dataset.id === film.id);
    });
  }

  function renderGrid() {
    renderFinishes();
    grid.textContent = '';
    const list = films.filter((f) => f.product === activeProduct
      && (activeFinish === 'All' || f.finish === activeFinish));
    list.forEach((f) => {
      const s = el('button', 'rs-swatch');
      s.type = 'button';
      s.dataset.id = f.id;
      s.title = `${f.name} (${f.id})`;
      s.style.background = f.color;
      s.setAttribute('aria-label', f.name);
      s.onclick = () => select(f);
      grid.append(s);
    });
    if (selected && list.some((f) => f.id === selected.id)) select(selected);
  }

  function renderAll() { renderTabs(); renderGrid(); }

  viewbar.querySelectorAll('.rs-view').forEach((b) => {
    b.onclick = () => {
      activeView = b.dataset.view;
      viewbar.querySelectorAll('.rs-view').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      if (selected) applyFilm(stage, selected, activeView);
    };
  });

  renderAll();
  select(films[0]);
}
