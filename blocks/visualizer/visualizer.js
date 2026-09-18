import { readBlockConfig } from '../../scripts/aem.js';

// three.js is loaded lazily from a CDN so it never weighs down first paint.
const THREE_VER = '0.160.0';
const CDN = `https://esm.sh/three@${THREE_VER}`;
const BASE = '/blocks/visualizer/assets';
// Fusion webhook that receives a shared snapshot as multipart/form-data.
const SHARE_ENDPOINT = 'https://hook.fusion.adobe.com/dntcs3kickjm3pnjq1rkcha10co8qjp5';
const MODEL = `${BASE}/sportscar.glb`;
const PPF_MODEL = `${BASE}/sportscar-ppf.glb`;

// Material names inside the model (from the FBX): `carpaint` is the wrap
// surface, `windowglass` is what window tint colors.
const PAINT_MAT = 'carpaint';
const GLASS_MAT = 'windowglass';

// PPF overlay meshes = Scotchgard Pro Series coverage tiers.
const PPF_MESH = { gold: 'sportscar_ppf_gold', platinum: 'sportscar_ppf_platinum' };

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

// Known content languages (DA folder names). The block picks the film sheet
// for the page's language and localizes its own chrome strings below.
const LANGS = ['en', 'de', 'jp', 'fr', 'ko', 'zh'];
const I18N = {
  en: {
    all: 'All', coverage: 'Coverage', platinum: 'Platinum (full)', gold: 'Gold (partial)', drag: 'Drag to rotate · scroll to zoom', loading: 'Loading 3D model…', notLoaded: 'Could not load the 3D model.', findInstaller: 'Find an installer',
  },
  de: {
    all: 'Alle', coverage: 'Abdeckung', platinum: 'Platin (voll)', gold: 'Gold (teilweise)', drag: 'Ziehen zum Drehen · Scrollen zum Zoomen', loading: '3D-Modell wird geladen…', notLoaded: '3D-Modell konnte nicht geladen werden.', findInstaller: 'Installateur finden',
  },
  jp: {
    all: 'すべて', coverage: 'カバー範囲', platinum: 'プラチナ（全体）', gold: 'ゴールド（部分）', drag: 'ドラッグで回転・スクロールでズーム', loading: '3Dモデルを読み込み中…', notLoaded: '3Dモデルを読み込めませんでした。', findInstaller: '施工店を探す',
  },
};

// How each finish maps to physically-based material params on the paint.
const FINISH_PBR = {
  Gloss: { metalness: 0.0, roughness: 0.08, clearcoat: 1.0 },
  Metallic: { metalness: 0.9, roughness: 0.25, clearcoat: 0.6 },
  ColorFlip: { metalness: 0.7, roughness: 0.18, clearcoat: 0.8 },
  Satin: { metalness: 0.2, roughness: 0.45, clearcoat: 0.2 },
  Brushed: { metalness: 0.85, roughness: 0.55, clearcoat: 0.1 },
  Matte: { metalness: 0.0, roughness: 0.9, clearcoat: 0.0 },
  Textured: { metalness: 0.3, roughness: 0.55, clearcoat: 0.2 },
  Clear: { metalness: 0.0, roughness: 0.12, clearcoat: 1.0 },
};

const VIEWS = {
  side: [4.6, 1.3, 0.1],
  front: [3.4, 1.4, 3.4],
  rear: [-3.4, 1.4, -3.4],
};

// Light and dark studio environments (marbled floor fading to a horizon).
const THEMES = {
  light: {
    bg: 0xdfe3e7, floor: 0xcfd4d9, fog: [34, 95], exposure: 1.05, ambient: 0.6,
  },
  dark: {
    bg: 0x16181b, floor: 0x2c3034, fog: [26, 78], exposure: 1.0, ambient: 0.35,
  },
};

// Procedural marbled-concrete floor texture so we ship no image asset.
function makeFloorTexture(THREE) {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b8bcc1';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 600; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 8 + Math.random() * 60;
    const shade = Math.random() < 0.5 ? 255 : 0;
    const a = 0.015 + Math.random() * 0.05;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${shade},${shade},${shade},${a})`);
    g.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

// Decode a base64 data URL ("data:image/png;base64,…") into a binary Blob so it
// can be sent as a file in multipart/form-data.
function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/data:(.*?);base64/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

// Small modal shown after a successful share: displays the returned download
// link with actions to copy it or open it in a new tab.
function showSharePopup(link) {
  const overlay = el('div', 'rs-share-popup');
  const dialog = el('div', 'rs-share-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Your shareable link');

  const closeBtn = el('button', 'rs-share-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', 'Close');

  const heading = el('h3', 'rs-share-heading', 'Your shareable link');

  const field = el('input', 'rs-share-link');
  field.type = 'text';
  field.readOnly = true;
  field.value = link;

  const actions = el('div', 'rs-share-actions');
  const copyBtn = el('button', 'rs-share-copy button', 'Copy Link');
  copyBtn.type = 'button';
  const downloadBtn = el('button', 'rs-share-download button', 'Download');
  downloadBtn.type = 'button';
  actions.append(copyBtn, downloadBtn);

  dialog.append(closeBtn, heading, field, actions);
  overlay.append(dialog);
  document.body.append(overlay);

  function close() {
    overlay.remove();
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    if (e.key === 'Escape') close();
  }
  document.addEventListener('keydown', onKey);
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  closeBtn.onclick = close;

  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Copied ✓';
    } catch (e) {
      field.select();
      copyBtn.textContent = 'Press Ctrl+C';
    }
    setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
  };
  downloadBtn.onclick = () => { window.open(link, '_blank', 'noopener'); };

  field.focus();
  field.select();
}

async function loadThree() {
  const [THREE, gltfMod, ctrlMod, envMod] = await Promise.all([
    import(/* webpackIgnore: true */ `${CDN}`),
    import(/* webpackIgnore: true */ `${CDN}/examples/jsm/loaders/GLTFLoader.js`),
    import(/* webpackIgnore: true */ `${CDN}/examples/jsm/controls/OrbitControls.js`),
    import(/* webpackIgnore: true */ `${CDN}/examples/jsm/environments/RoomEnvironment.js`),
  ]);
  return {
    THREE,
    GLTFLoader: gltfMod.GLTFLoader,
    OrbitControls: ctrlMod.OrbitControls,
    RoomEnvironment: envMod.RoomEnvironment,
  };
}

// Build the 3D scene and return a small API the UI drives.
async function initStage(stage, modelUrl, ppfUrl) {
  const {
    THREE, GLTFLoader, OrbitControls, RoomEnvironment,
  } = await loadThree();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.fog = new THREE.Fog(THEMES.light.bg, ...THEMES.light.fog);
  scene.background = new THREE.Color(THEMES.light.bg);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(...VIEWS.side);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 2.05;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.6);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(6, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 40;
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004;
  scene.add(key);

  // marbled studio floor
  const floorMat = new THREE.MeshStandardMaterial({
    map: makeFloorTexture(THREE), color: THEMES.light.floor, roughness: 0.75, metalness: 0.0,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(80, 96), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const paints = [];
  const glasses = [];

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  const model = gltf.scene;

  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.castShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (m.name === PAINT_MAT) {
        const up = new THREE.MeshPhysicalMaterial({
          color: m.color, metalness: 0, roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06,
        });
        o.material = Array.isArray(o.material)
          ? o.material.map((x) => (x.name === PAINT_MAT ? up : x)) : up;
        paints.push(up);
      } else if (m.name === GLASS_MAT) {
        m.transparent = true;
        m.opacity = 0.35;
        glasses.push(m);
      }
    });
  });

  // PPF overlay: parented under the car so it inherits the same transform.
  const ppfMeshes = {};
  let ppfMat = null;
  if (ppfUrl) {
    try {
      const ppfGltf = await loader.loadAsync(ppfUrl);
      ppfGltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.visible = false;
        if (o.material) {
          o.material.transparent = true;
          ppfMat = o.material;
        }
        if (o.name === PPF_MESH.gold) ppfMeshes.gold = o;
        if (o.name === PPF_MESH.platinum) ppfMeshes.platinum = o;
      });
      model.add(ppfGltf.scene);
    } catch (e) {
      // PPF overlay is optional; fall back to roughness-only PPF below.
    }
  }

  // center + frame the car, and drop the floor to the car's base
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
  floor.position.y = box.min.y - center.y;
  const radius = box.getSize(new THREE.Vector3()).length() / 2;
  const dist = radius / Math.sin((camera.fov * Math.PI) / 360);
  camera.position.setLength(dist);
  controls.target.set(0, 0, 0);
  controls.update();

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight || Math.round(w * 0.6);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }());

  let coverage = 'platinum';
  let ppfActive = false;

  function showPPF() {
    Object.entries(ppfMeshes).forEach(([tier, mesh]) => {
      mesh.visible = ppfActive && tier === coverage;
    });
  }

  function setTheme(mode) {
    const t = THEMES[mode] || THEMES.light;
    const [near, far] = t.fog;
    scene.background.set(t.bg);
    scene.fog.color.set(t.bg);
    scene.fog.near = near;
    scene.fog.far = far;
    floorMat.color.set(t.floor);
    hemi.intensity = t.ambient;
    renderer.toneMappingExposure = t.exposure;
  }

  return {
    hasPPF: Object.keys(ppfMeshes).length > 0,
    // Capture the current view as a base64 data URL. WebGL clears the drawing
    // buffer after each frame, so force a fresh render and read it back in the
    // same call stack (no preserveDrawingBuffer needed).
    capture(type = 'image/png', quality = 0.92) {
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL(type, quality);
    },
    setTheme,
    setFilm(film) {
      if (film.product === 'Window Tint') {
        ppfActive = false;
        showPPF();
        glasses.forEach((g) => { g.color.set(film.color); g.opacity = 0.55; });
        return;
      }
      glasses.forEach((g) => { g.color.set(0x0d1a17); g.opacity = 0.35; });
      if (film.product === 'Paint Protection Film') {
        const matte = film.finish === 'Matte';
        if (ppfMat) {
          // clear glossy film, or a translucent matte film over the paint
          ppfMat.color.set(matte ? 0xd7d7d7 : 0xffffff);
          ppfMat.opacity = matte ? 0.22 : 0.1;
          ppfMat.roughness = matte ? 0.95 : 0.04;
          ppfMat.metalness = 0;
          ppfMat.needsUpdate = true;
        }
        // matte PPF also flattens the paint sheen underneath
        paints.forEach((p) => { p.roughness = matte ? 0.8 : 0.1; p.clearcoat = matte ? 0.15 : 1; });
        ppfActive = true;
        showPPF();
        return;
      }
      ppfActive = false;
      showPPF();
      const pbr = FINISH_PBR[film.finish] || { metalness: 0.2, roughness: 0.4, clearcoat: 0.5 };
      paints.forEach((p) => {
        p.color.set(film.color);
        p.metalness = pbr.metalness;
        p.roughness = pbr.roughness;
        p.clearcoat = pbr.clearcoat;
        p.needsUpdate = true;
      });
    },
    setCoverage(tier) {
      if (ppfMeshes[tier]) coverage = tier;
      showPPF();
    },
    setView(name) {
      const v = VIEWS[name] || VIEWS.side;
      camera.position.set(...v).setLength(dist);
      controls.update();
    },
  };
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  const seg = (window.location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const lang = LANGS.includes(seg) ? seg : 'en';
  const t = I18N[lang] || I18N.en;
  const source = cfg.source || `/${lang}/consumer/films.json`;
  const title = cfg.title || '3M Restyling Studio Visualizer';
  const modelUrl = cfg.model || MODEL;
  const ppfUrl = cfg.ppf || PPF_MODEL;

  block.textContent = '';
  block.classList.add('rs-visualizer');

  const stage = el('div', 'rs-stage');
  let activeTheme = 'light';
  const themeBar = el('div', 'rs-theme');
  [['light', 'Light', '☀'], ['dark', 'Dark', '☾']].forEach(([mode, label, icon]) => {
    const b = el('button', `rs-theme-btn${mode === activeTheme ? ' is-active' : ''}`, icon);
    b.type = 'button';
    b.dataset.theme = mode;
    b.title = `${label} background`;
    b.setAttribute('aria-label', `${label} background`);
    themeBar.append(b);
  });
  stage.append(themeBar);

  const viewbar = el('div', 'rs-viewbar');
  ['Side', 'Front', 'Rear'].forEach((v, i) => {
    const b = el('button', `rs-view${i === 0 ? ' is-active' : ''}`, v);
    b.type = 'button';
    b.dataset.view = v.toLowerCase();
    viewbar.append(b);
  });
  const caption = el('div', 'rs-caption', t.loading);

  const panel = el('aside', 'rs-panel-ui');
  panel.append(el('h2', 'rs-title', title));
  const productTabs = el('div', 'rs-tabs');
  const finishRow = el('div', 'rs-filters');
  const coverageRow = el('div', 'rs-coverage');
  const grid = el('div', 'rs-grid');
  const detail = el('div', 'rs-detail');
  // opens the locator as a full-screen takeover (shared with the locator block)
  const cta = el('button', 'rs-cta button', t.findInstaller);
  cta.type = 'button';
  cta.onclick = async () => {
    const { openLocatorModal } = await import('../locator/locator.js');
    openLocatorModal({ source: cfg.installers, title: t.findInstaller });
  };
  // captures the current 3D view and posts it to the Fusion share webhook
  const share = el('button', 'rs-share button', 'Share');
  share.type = 'button';
  panel.append(productTabs, finishRow, coverageRow, grid, detail, cta, share);

  const stageWrap = el('div', 'rs-stagewrap');
  stageWrap.append(stage, viewbar, caption);
  block.append(stageWrap, panel);

  // load the language sheet; fall back to the root editing master
  async function loadFilms(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    return json.data || json;
  }
  let films = [];
  try {
    films = await loadFilms(source);
  } catch (e) {
    try {
      films = await loadFilms('/films.json');
    } catch (e2) {
      grid.textContent = 'Could not load the film catalog.';
      return;
    }
  }

  let viewer = null;
  const products = [...new Set(films.map((f) => f.product))];
  let activeProduct = products[0];
  let activeFinish = 'All';
  let activeCoverage = 'platinum';
  let selected = null;

  function finishesFor(product) {
    return ['All', ...new Set(films.filter((f) => f.product === product).map((f) => f.finish))];
  }

  // Display labels come from the (translatable) sheet; logic uses stable keys.
  function productLabel(product) {
    const f = films.find((x) => x.product === product);
    return (f && f.productLabel) || product;
  }
  function finishLabel(finish) {
    if (finish === 'All') return t.all;
    const f = films.find((x) => x.finish === finish);
    return (f && f.finishLabel) || finish;
  }

  function renderTabs() {
    productTabs.textContent = '';
    products.forEach((p) => {
      const b = el('button', `rs-tab${p === activeProduct ? ' is-active' : ''}`, productLabel(p));
      b.type = 'button';
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => { activeProduct = p; activeFinish = 'All'; renderAll(); };
      productTabs.append(b);
    });
  }

  function renderFinishes() {
    finishRow.textContent = '';
    finishesFor(activeProduct).forEach((f) => {
      const b = el('button', `rs-chip${f === activeFinish ? ' is-active' : ''}`, finishLabel(f));
      b.type = 'button';
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => { activeFinish = f; renderGrid(); };
      finishRow.append(b);
    });
  }

  function select(film) {
    selected = film;
    if (viewer) viewer.setFilm(film);
    caption.textContent = `${productLabel(film.product)} · ${film.series}`;
    detail.innerHTML = `
      <div class="rs-swatch-lg" style="background:${film.color}"></div>
      <div>
        <strong>${film.name}</strong>
        <span class="rs-sku">${film.id}</span>
        <p>${film.hint || FINISH_HINT[film.finish] || ''}</p>
      </div>`;
    grid.querySelectorAll('.rs-swatch').forEach((s) => {
      s.classList.toggle('is-active', s.dataset.id === film.id);
    });
  }

  function renderCoverage() {
    coverageRow.textContent = '';
    const isPPF = activeProduct === 'Paint Protection Film' && viewer && viewer.hasPPF;
    coverageRow.style.display = isPPF ? '' : 'none';
    if (!isPPF) return;
    coverageRow.append(el('span', 'rs-coverage-label', t.coverage));
    [['platinum', t.platinum], ['gold', t.gold]].forEach(([tier, label]) => {
      const b = el('button', `rs-chip${tier === activeCoverage ? ' is-active' : ''}`, label);
      b.type = 'button';
      b.onclick = () => { activeCoverage = tier; viewer.setCoverage(tier); renderCoverage(); };
      coverageRow.append(b);
    });
  }

  function renderGrid() {
    renderFinishes();
    renderCoverage();
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
    // keep the current film if it belongs to this product, else pick the first
    if (list.length) {
      const keep = selected && list.find((f) => f.id === selected.id);
      select(keep || list[0]);
    }
  }

  function renderAll() {
    renderTabs();
    renderGrid();
  }

  viewbar.querySelectorAll('.rs-view').forEach((b) => {
    b.onclick = () => {
      viewbar.querySelectorAll('.rs-view').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      if (viewer) viewer.setView(b.dataset.view);
    };
  });

  themeBar.querySelectorAll('.rs-theme-btn').forEach((b) => {
    b.onclick = () => {
      activeTheme = b.dataset.theme;
      themeBar.querySelectorAll('.rs-theme-btn').forEach((x) => x.classList.remove('is-active'));
      b.classList.add('is-active');
      if (viewer) viewer.setTheme(activeTheme);
    };
  });

  share.onclick = async () => {
    if (!viewer) return;
    const label = share.textContent;
    share.disabled = true;
    share.textContent = 'Sharing…';
    try {
      const dataUrl = viewer.capture('image/png');
      const blob = dataUrlToBlob(dataUrl);
      const mimetype = blob.type || 'image/png';
      const form = new FormData();
      const filename = `A${Date.now()}`;
      form.append('filename', filename);
      form.append('mimetype', mimetype);
      form.append('fileblob', blob, filename);
      const res = await fetch(SHARE_ENDPOINT, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      share.textContent = 'Shared ✓';
      if (data && data.downloadlink) showSharePopup(data.downloadlink);
    } catch (e) {
      share.textContent = 'Try again';
    } finally {
      share.disabled = false;
      setTimeout(() => { share.textContent = label; }, 2500);
    }
  };

  renderAll();

  try {
    viewer = await initStage(stage, modelUrl, ppfUrl);
    viewer.setTheme(activeTheme);
    caption.textContent = t.drag;
    renderCoverage();
    select(selected || films[0]);
  } catch (e) {
    stage.classList.add('rs-stage-error');
    caption.textContent = t.notLoaded;
  }
}
