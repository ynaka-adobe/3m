import { readBlockConfig } from '../../scripts/aem.js';

// three.js is loaded lazily from a CDN so it never weighs down first paint.
const THREE_VER = '0.160.0';
const CDN = `https://esm.sh/three@${THREE_VER}`;
const BASE = '/blocks/visualizer/assets';
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

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
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

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(...VIEWS.side);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3;
  controls.maxDistance = 9;
  controls.maxPolarAngle = Math.PI / 1.9;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(5, 8, 5);
  scene.add(key);

  const paints = [];
  const glasses = [];

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(modelUrl);
  const model = gltf.scene;

  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
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

  // center + frame the car
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  scene.add(model);
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

  return {
    hasPPF: Object.keys(ppfMeshes).length > 0,
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
  const source = cfg.source || '/films.json';
  const title = cfg.title || '3M Restyling Studio Visualizer';
  const modelUrl = cfg.model || MODEL;
  const ppfUrl = cfg.ppf || PPF_MODEL;

  block.textContent = '';
  block.classList.add('rs-visualizer');

  const stage = el('div', 'rs-stage');
  const viewbar = el('div', 'rs-viewbar');
  ['Side', 'Front', 'Rear'].forEach((v, i) => {
    const b = el('button', `rs-view${i === 0 ? ' is-active' : ''}`, v);
    b.type = 'button';
    b.dataset.view = v.toLowerCase();
    viewbar.append(b);
  });
  const caption = el('div', 'rs-caption', 'Loading 3D model…');

  const panel = el('aside', 'rs-panel-ui');
  panel.append(el('h2', 'rs-title', title));
  const productTabs = el('div', 'rs-tabs');
  const finishRow = el('div', 'rs-filters');
  const coverageRow = el('div', 'rs-coverage');
  const grid = el('div', 'rs-grid');
  const detail = el('div', 'rs-detail');
  const cta = el('a', 'rs-cta button', 'Find an installer');
  cta.href = cfg.installer || 'https://www.3m.com/3M/en_US/car-personalization-us/where-to-buy/';
  cta.target = '_blank';
  cta.rel = 'noopener';
  panel.append(productTabs, finishRow, coverageRow, grid, detail, cta);

  const stageWrap = el('div', 'rs-stagewrap');
  stageWrap.append(stage, viewbar, caption);
  block.append(stageWrap, panel);

  let films = [];
  try {
    const res = await fetch(source);
    const json = await res.json();
    films = json.data || json;
  } catch (e) {
    grid.textContent = 'Could not load the film catalog.';
    return;
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
    if (viewer) viewer.setFilm(film);
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

  function renderCoverage() {
    coverageRow.textContent = '';
    const isPPF = activeProduct === 'Paint Protection Film' && viewer && viewer.hasPPF;
    coverageRow.style.display = isPPF ? '' : 'none';
    if (!isPPF) return;
    coverageRow.append(el('span', 'rs-coverage-label', 'Coverage'));
    [['platinum', 'Platinum (full)'], ['gold', 'Gold (partial)']].forEach(([tier, label]) => {
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

  renderAll();

  try {
    viewer = await initStage(stage, modelUrl, ppfUrl);
    caption.textContent = 'Drag to rotate · scroll to zoom';
    renderCoverage();
    select(selected || films[0]);
  } catch (e) {
    stage.classList.add('rs-stage-error');
    caption.textContent = 'Could not load the 3D model.';
  }
}
