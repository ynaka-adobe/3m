import { readBlockConfig } from '../../scripts/aem.js';

// Default vehicle assets shipped with the block. Any of these can be overridden
// per page by authoring `vehicle` / `mask` / `glass` rows in the block table,
// so a real masked vehicle photo drops in without code changes.
const BASE = '/blocks/visualizer/assets';
const DEFAULTS = {
  vehicle: `${BASE}/vehicle-sedan.svg`,
  mask: `${BASE}/vehicle-sedan-body.svg`,
  glass: `${BASE}/vehicle-sedan-glass.svg`,
};

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

// Per-finish render tuning: how the colored wrap layer blends over the base
// photo, and how strong the reflective sheen reads on top.
const FINISH_RENDER = {
  Gloss: { blend: 'multiply', wrap: 0.95, sheen: 0.9 },
  Metallic: { blend: 'multiply', wrap: 0.9, sheen: 0.8 },
  ColorFlip: { blend: 'multiply', wrap: 0.85, sheen: 0.85 },
  Satin: { blend: 'multiply', wrap: 0.92, sheen: 0.4 },
  Brushed: { blend: 'multiply', wrap: 0.85, sheen: 0.5 },
  Matte: { blend: 'multiply', wrap: 0.98, sheen: 0.08 },
  Textured: { blend: 'multiply', wrap: 0.9, sheen: 0.5 },
  Clear: { blend: 'multiply', wrap: 0, sheen: 0.7 },
};

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function applyFilm(stage, film) {
  const wrap = stage.querySelector('.rs-wrap');
  const sheen = stage.querySelector('.rs-sheen');
  const glass = stage.querySelector('.rs-glass-layer');
  const r = FINISH_RENDER[film.finish] || { blend: 'multiply', wrap: 0.9, sheen: 0.5 };
  stage.classList.toggle('rs-carbon', film.finish === 'Textured');

  // window tint colors the glass, leaves the paint alone
  if (film.product === 'Window Tint') {
    wrap.style.opacity = '0';
    glass.style.background = film.color;
    glass.style.opacity = '0.8';
    sheen.style.opacity = '0';
    return;
  }

  glass.style.opacity = '0';
  // paint protection film keeps the paint; matte PPF just knocks back the sheen
  if (film.product === 'Paint Protection Film') {
    wrap.style.opacity = '0';
    sheen.style.opacity = film.finish === 'Matte' ? '0.05' : '0.7';
    return;
  }

  wrap.style.background = film.color;
  wrap.style.mixBlendMode = r.blend;
  wrap.style.opacity = String(r.wrap);
  sheen.style.opacity = String(r.sheen);
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const source = cfg.source || '/films.json';
  const title = cfg.title || '3M Restyling Studio Visualizer';
  const vehicle = cfg.vehicle || DEFAULTS.vehicle;
  const mask = cfg.mask || DEFAULTS.mask;
  const glassMask = cfg.glass || DEFAULTS.glass;

  block.textContent = '';
  block.classList.add('rs-visualizer');

  // ---- stage: layered masked-photo render ----
  const stage = el('div', 'rs-stage');
  const photo = el('img', 'rs-photo');
  photo.src = vehicle;
  photo.alt = 'Vehicle preview';
  photo.loading = 'eager';
  const wrap = el('div', 'rs-wrap');
  const glass = el('div', 'rs-glass-layer');
  const sheen = el('div', 'rs-sheen');
  wrap.style.webkitMaskImage = `url("${mask}")`;
  wrap.style.maskImage = `url("${mask}")`;
  sheen.style.webkitMaskImage = `url("${mask}")`;
  sheen.style.maskImage = `url("${mask}")`;
  glass.style.webkitMaskImage = `url("${glassMask}")`;
  glass.style.maskImage = `url("${glassMask}")`;
  stage.append(photo, wrap, glass, sheen);

  const viewbar = el('div', 'rs-viewbar');
  ['Side', 'Front', 'Rear'].forEach((v, i) => {
    const b = el('button', `rs-view${i === 0 ? ' is-active' : ''}`, v);
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
  let selected = null;

  function finishesFor(product) {
    return ['All', ...new Set(films.filter((f) => f.product === product).map((f) => f.finish))];
  }

  function renderTabs() {
    productTabs.textContent = '';
    products.forEach((p) => {
      const b = el('button', `rs-tab${p === activeProduct ? ' is-active' : ''}`, p);
      b.type = 'button';
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => { activeProduct = p; activeFinish = 'All'; renderAll(); };
      productTabs.append(b);
    });
  }

  function renderFinishes() {
    finishRow.textContent = '';
    finishesFor(activeProduct).forEach((f) => {
      const b = el('button', `rs-chip${f === activeFinish ? ' is-active' : ''}`, f);
      b.type = 'button';
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => { activeFinish = f; renderGrid(); };
      finishRow.append(b);
    });
  }

  function select(film) {
    selected = film;
    applyFilm(stage, film);
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

  function renderAll() {
    renderTabs();
    renderGrid();
  }

  // view toggle just nudges the stage to hint a different angle
  viewbar.querySelectorAll('.rs-view').forEach((b) => {
    b.onclick = () => {
      stage.dataset.view = b.dataset.view;
      viewbar.querySelectorAll('.rs-view').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
    };
  });

  renderAll();
  select(films[0]);
}
