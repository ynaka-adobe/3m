import { readBlockConfig } from '../../scripts/aem.js';
import {
  I18N, STUDIO_I18N, INFO_LINKS, SHARE_I18N,
} from './strings.js';
import { VEHICLES, DEFAULT_VEHICLE } from './vehicles.js';

// three.js is loaded lazily from a CDN so it never weighs down first paint.
const THREE_VER = '0.160.0';
const CDN = `https://esm.sh/three@${THREE_VER}`;
const BASE = '/blocks/visualizer/assets';
// Fusion webhook that receives a shared snapshot as multipart/form-data.
const SHARE_ENDPOINT = 'https://hook.fusion.adobe.com/dntcs3kickjm3pnjq1rkcha10co8qjp5';

// Material name inside the models (from the FBX) that window tint colors.
const GLASS_MAT = 'windowglass';

const FINISH_HINT = {
  Gloss: 'High-shine mirror finish.',
  'High Gloss': 'Deep, extra-high-gloss finish with a paint-like shine.',
  Matte: 'Flat, non-reflective look.',
  Satin: 'Soft sheen between matte and gloss.',
  Metallic: 'Metal-flake depth that shifts in light.',
  ColorFlip: 'Color-shifting flip depending on angle.',
  Brushed: 'Brushed-metal texture.',
  Textured: 'Carbon-fiber texture.',
  Texture: 'Textured finish such as brushed metal or carbon fiber.',
  Tint: 'Applies to the glass, not the body.',
  Clear: 'Invisible protection with a subtle sheen.',
};

// Known content languages (DA folder names). The block picks the film sheet
// for the page's language and localizes its own chrome strings below.
const LANGS = ['en', 'de', 'jp', 'fr', 'ko', 'zh'];
// campaign tracking the original appends to links shared on each network
const SHARE_UTM = {
  facebook: 'tebg-csd-autoent-en_us-eng-autoenthusiast-osm-fb-na-checkoutmydesign-visitfromshare-ne19-na',
  twitter: 'tebg-csd-autoent-en_us-eng-autoenthusiast-osm-twt-na-checkoutmydesign-visitfromshare-ne19-na',
};
// Wrappable parts (per vehicle in vehicles.js). "Entire Vehicle" covers the six
// body parts; accents are separate.
const BODY_PARTS = ['front', 'hood', 'left', 'top', 'right', 'rear'];
const WRAP_PRODUCTS = ['Wrap Film', 'Protection Wrap Film'];
// short keys for design links
const PART_CODES = {
  front: 'f', hood: 'h', left: 'l', top: 't', right: 'r', rear: 'b', accents: 'a',
};

// A shared link reopens the design:
// #d/<layers>~<coverage>~<view>~<theme>~<vehicle>, layers = "e:G247,a:G12,w:CRBLK35"
// (e = entire vehicle, w = window tint, p = paint protection; vehicle = its
// one-letter code). Older links carry a single film id instead of layers.
const DESIGN_HASH = /^#d\/([^~]+)(?:~(silver|gold|platinum))?(?:~(side|front|rear))?(?:~(light|dark))?(?:~([A-Z]))?$/;
const TIER_ORDER = ['silver', 'gold', 'platinum'];

// Translated pages label the config rows in their own language; map those
// labels to the block's keys (readBlockConfig drops non-latin labels).
const CONFIG_KEYS = {
  quelle: 'source', ソース: 'source', titel: 'title', titre: 'title', タイトル: 'title',
};

function readConfig(block) {
  const cfg = readBlockConfig(block);
  block.querySelectorAll(':scope > div').forEach((row) => {
    const [label, value] = row.children;
    const key = label && CONFIG_KEYS[label.textContent.trim().toLowerCase()];
    if (key && value && !cfg[key]) {
      const link = value.querySelector('a');
      cfg[key] = link ? link.href : value.textContent.trim();
    }
  });
  return cfg;
}

// How each finish maps to physically-based material params on the paint.
const FINISH_PBR = {
  Gloss: { metalness: 0.0, roughness: 0.08, clearcoat: 1.0 },
  'High Gloss': { metalness: 0.0, roughness: 0.04, clearcoat: 1.0 },
  Metallic: { metalness: 0.9, roughness: 0.25, clearcoat: 0.6 },
  ColorFlip: { metalness: 0.7, roughness: 0.18, clearcoat: 0.8 },
  Satin: { metalness: 0.2, roughness: 0.45, clearcoat: 0.2 },
  Brushed: { metalness: 0.85, roughness: 0.55, clearcoat: 0.1 },
  Matte: { metalness: 0.0, roughness: 0.9, clearcoat: 0.0 },
  Textured: { metalness: 0.3, roughness: 0.55, clearcoat: 0.2 },
  Texture: { metalness: 0.3, roughness: 0.55, clearcoat: 0.2 },
  Clear: { metalness: 0.0, roughness: 0.12, clearcoat: 1.0 },
};

// Per-film material presets (the sheet's `preset` column, named after the
// 3M Restyling Studio presets). These win over the finish defaults above.
const DEFAULT_PBR = { metalness: 0.2, roughness: 0.4, clearcoat: 0.5 };

const PRESET_PBR = {
  'gloss-modern': { metalness: 0.1, roughness: 0.1, clearcoat: 1.0 },
  'gloss-modern-metallic': { metalness: 0.75, roughness: 0.3, clearcoat: 1.0 },
  'satin-modern': { metalness: 0.0, roughness: 0.5, clearcoat: 0.15 },
  'satin-modern-metallic': { metalness: 0.6, roughness: 0.4, clearcoat: 0.15 },
  'matte-modern': { metalness: 0.0, roughness: 0.9, clearcoat: 0.0 },
  'matte-modern-metallic': { metalness: 0.6, roughness: 0.75, clearcoat: 0.0 },
  'brushed-metal': { metalness: 0.85, roughness: 0.45, clearcoat: 0.0 },
  'carbon-modern': { metalness: 0.3, roughness: 0.5, clearcoat: 0.5 },
  'two-color': { metalness: 0.7, roughness: 0.18, clearcoat: 0.8 },
  physical: { metalness: 0.9, roughness: 0.6, clearcoat: 0.0 },
};

const VIEWS = {
  side: [4.6, 1.3, 0.1],
  front: [3.4, 1.4, 3.4],
  rear: [-3.4, 1.4, -3.4],
};

// Day and night studio, as in the original: its baked backdrop, light levels
// and reflections (day: soft room light, night: its night sky box).
const THEMES = {
  light: {
    backdrop: 'backdrop-day.webp', bg: 0xdfe3e7, exposure: 1.05, ambient: 0.6, key: 2.2,
  },
  dark: {
    backdrop: 'backdrop-night.webp', bg: 0x101113, exposure: 1.0, ambient: 0.3, key: 1.5,
  },
};

// an unwrapped part shows the original's matte primer grey
const PRIMER = {
  color: 0xc4c7ca, metalness: 0, roughness: 0.85, clearcoat: 0,
};

// finish filter icons (the original's finish-group overlays)
const FINISH_ICON = {
  Gloss: 'gloss', 'High Gloss': 'gloss', Matte: 'matte', Satin: 'satin',
};

// the original's coverage shields: one outline, filled more for more coverage
const SHIELD_OUTLINE = 'M19.01,50.05l-0.48-0.21C17.78,49.51,0,41.67,0,27.47V3.18l1.44,0.28c0.08,0.01,7.83,1.41,17.04-3.19L19.01,0 l0.54,0.27c9.21,4.6,16.97,3.2,17.04,3.19l1.43-0.27l0,24.29c0,14.2-17.78,22.04-18.54,22.37L19.01,50.05z M2.41,6.01v21.46 c0,11.41,13.83,18.61,16.6,19.93c2.77-1.33,16.6-8.53,16.6-19.93V6.01c-2.76,0.23-9.16,0.25-16.6-3.32 C11.57,6.26,5.17,6.24,2.41,6.01z';
const SHIELD_FILL = {
  silver: 'M13.26,16.01v11.46c0,2.32,2.69,5.15,5.76,7.38c3.07-2.23,5.76-5.06,5.76-7.38V16.01 c-1.82-0.38-3.75-0.9-5.76-1.6C17.01,15.12,15.08,15.63,13.26,16.01z',
  gold: 'M11.05,14.18v13.29c0,3.8,4.18,7.59,7.97,10.06c3.79-2.47,7.97-6.26,7.97-10.06V14.18 c-2.43-0.4-5.12-1.06-7.97-2.12C16.17,13.12,13.48,13.78,11.05,14.18z',
  platinum: 'M7.84,11.37v16.1c0,6.41,7.17,11.46,11.18,13.79c4.01-2.33,11.18-7.37,11.18-13.79v-16.1 c-3.13-0.29-6.98-1.04-11.18-2.75C14.81,10.33,10.96,11.08,7.84,11.37z',
};
const shieldIcon = (tier) => `<svg class="rs-chip-shield" viewBox="0 0 38.03 50.05" aria-hidden="true" fill="currentColor"><path d="${SHIELD_OUTLINE}"/><path d="${SHIELD_FILL[tier]}"/></svg>`;

// Two-tone flip films: at glancing angles the colour blends toward the film's
// start/end colours (the original's two-colour shader), added to the
// physical material's fragment shader.
function addFlip(THREE, mat) {
  const flip = {
    rsFlipA: { value: new THREE.Color() },
    rsFlipB: { value: new THREE.Color() },
    rsFlipAmount: { value: 0 },
    rsFlipStrength: { value: 1 },
  };
  mat.userData.flip = flip;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, flip);
    shader.fragmentShader = `uniform vec3 rsFlipA;
uniform vec3 rsFlipB;
uniform float rsFlipAmount;
uniform float rsFlipStrength;
${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
  float rsFacing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
  float rsGlance = clamp((1.0 - rsFacing) * (0.8 + 0.15 * rsFlipStrength), 0.0, 1.0);
  diffuseColor.rgb = mix(diffuseColor.rgb, mix(rsFlipA, rsFlipB, rsGlance),
    rsFlipAmount * smoothstep(0.1, 0.9, rsGlance));`);
  };
  mat.customProgramCacheKey = () => 'rs-flip';
}

// Swatch fill: the film's color, or its texture image (brushed, carbon…) over it.
function swatchBg(film) {
  return film.swatchImage ? `${film.color} url("${film.swatchImage}") center / cover` : film.color;
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

// The original studio's analytics events (its 2026-06-19 spec: name, type and
// id), sent through the site's consent-gated analytics, loaded on first use.
const STUDIO_EVENTS = {
  toggle: ['RS_Toggle updated', 'Select', '1.2.1'],
  category: ['RS_Product Category', 'Select', '1.2.2'],
  wrap: ['RS_Wrap Films Application', 'Select', '1.2.3'],
  accent: ['RS_Accents Application', 'Select', '1.2.4'],
  tint: ['RS_Tints Application', 'Select', '1.2.5'],
  ppf: ['RS_Paint Protection Film Application', 'Select', '1.2.6'],
  pwf: ['RS_Protection Wrap Film Application', 'Select', '1.2.7'],
  vehicle: ['RS_Vehicle Class updated', 'Button Click', '1.2.9'],
  done: ['RS_Studio completion', 'Button Click', '1.2.10'],
  installer: ['RS_Studio Find an Installer', 'Link Click', '2.3'],
  search: ['RS_Studio Installer Search', 'Button Click', '2.4'],
  results: ['RS_Studio Installer Search results', 'Success', '2.5'],
  shop: ['RS_Studio Installer shop interaction', 'Exit Link', '2.6'],
  share: ['RS_Studio Share', 'Exit Link', '2.7'],
};
// English names the events report, whatever the page language
const CATEGORY_EVENT_NAME = {
  'Wrap Film': 'Wrap Films',
  'Protection Wrap Film': 'Protection Wrap Film',
  'Window Tint': 'Automotive Window Tints',
  'Paint Protection Film': 'Paint Protection',
};
// the original's paint protection film codes: coverage, then M(atte) or G(loss)
const PPF_EVENT_CODE = { silver: 'PF', gold: 'FF', platinum: 'FC' };
const NO_SELECTION = 'NONE';
const COORDS = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;
let analyticsLoad;

function studioEvent(key, { suffix, stage = 'studio', ...fields } = {}) {
  const [name, type, id] = STUDIO_EVENTS[key];
  const payload = {
    event_name: suffix ? `${name}: ${suffix}` : name,
    event_type: type,
    event_id: `20260619_RS_${id}`,
    funnel_stage: stage,
    app_name: 'restyling_studio',
    ...fields,
  };
  // one shared load keeps the events in the order they happened
  analyticsLoad = analyticsLoad || import('../../scripts/analytics.js');
  analyticsLoad
    .then(({ track }) => track('restyling-studio', { studio: payload }))
    .catch(() => {});
}

// the design link with a network's campaign tracking added
function trackedUrl(url, network) {
  const u = new URL(url);
  u.searchParams.set('utm_term', SHARE_UTM[network]);
  return u.toString();
}

// simple line icons for the share networks (24×24, currentColor)
const SHARE_ICONS = {
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
  x: '<path d="M4 4l6.5 8.6L4.3 20H6l5.3-6.1L15.8 20H20l-6.8-9.1L19 4h-1.7l-4.9 5.6L8.2 4H4z"/>',
  email: '<path d="M3 6h18v12H3z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2"/>',
};

// Copy text even where the async clipboard API is unavailable (e.g. framed previews).
async function copyText(text, host) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const area = el('textarea', 'rs-share-copybuffer');
    area.value = text;
    host.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch (e2) {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

/**
 * Share dialog: snapshot preview, Facebook / X / Email, the design link to
 * copy, and Download of the snapshot. Once the webhook upload finishes, the
 * hosted image link is added to the email.
 * @returns {{ uploaded: Function, failed: Function }}
 */
// A native modal <dialog>: the browser keeps focus inside, makes the page
// behind it inert, closes it on Esc and returns focus to the opener. A click
// on the backdrop closes it too (closedby="any"; Safari needs the fallback).
// Named by its heading; onClose gets the dialog's returnValue.
let modalCount = 0;
function openModal(className, heading, { role, onClose = () => {} } = {}) {
  const dialog = el('dialog', className);
  if (role) dialog.setAttribute('role', role);
  modalCount += 1;
  heading.id = `rs-dialog-title-${modalCount}`;
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.setAttribute('closedby', 'any');
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = r.top <= e.clientY && e.clientY <= r.bottom
        && r.left <= e.clientX && e.clientX <= r.right;
      if (!inside) dialog.close();
    });
  }
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose(dialog.returnValue);
  });
  return dialog;
}

function showShareDialog({
  s, image, url, text, onEvent = () => {},
}) {
  const heading = el('h3', 'rs-share-heading', s.title);
  const dialog = openModal('rs-share-dialog', heading);

  const closeBtn = el('button', 'rs-share-close', '×');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', s.close);
  closeBtn.autofocus = true;

  const preview = el('img', 'rs-share-image');
  preview.src = image;
  preview.alt = text;
  const status = el('p', 'rs-share-status');
  status.setAttribute('aria-live', 'polite');

  const [hashtag] = s.hashtags.split(' ');
  let mailBody = `${text}\n\n${url}`;
  const mailto = () => `mailto:?${new URLSearchParams({ subject: s.subject, body: mailBody }).toString().replace(/\+/g, '%20')}`;
  const networks = [
    ['facebook', 'Facebook', `https://www.facebook.com/sharer/sharer.php?${new URLSearchParams({ u: trackedUrl(url, 'facebook'), hashtag })}`],
    ['x', 'X', `https://twitter.com/intent/tweet?${new URLSearchParams({
      url: trackedUrl(url, 'twitter'), text, hashtags: s.hashtags.replace(/#/g, '').split(' ').join(','),
    })}`],
    ['email', s.email, ''],
  ];
  // Every action is a <button>: some preview hosts intercept <a> clicks.
  const social = el('div', 'rs-share-social');
  const targets = {};
  networks.forEach(([key, label, href]) => {
    targets[key] = href;
    const b = el('button', `rs-share-net rs-share-${key}`);
    b.type = 'button';
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${SHARE_ICONS[key]}</svg><span>${label}</span>`;
    b.onclick = () => {
      onEvent(key);
      if (key === 'email') {
        // hand off to the mail app (detached link), and offer webmail in case
        // no app is registered for mailto: links
        const a = document.createElement('a');
        a.href = mailto();
        a.click();
        // eslint-disable-next-line no-use-before-define
        mailAlt.hidden = false;
        return;
      }
      // share window; a blocked popup returns null, so say so
      const win = window.open(targets[key], '_blank', 'width=640,height=600');
      if (win) win.opener = null;
      else status.textContent = s.blocked;
    };
    social.append(b);
  });

  // webmail fallback, shown after Email is clicked
  const mailAlt = el('div', 'rs-share-mailalt');
  mailAlt.hidden = true;
  mailAlt.append(el('span', '', s.noMail));
  const webmail = {
    Gmail: () => `https://mail.google.com/mail/?${new URLSearchParams({
      view: 'cm', fs: 1, su: s.subject, body: mailBody,
    })}`,
    Outlook: () => `https://outlook.live.com/mail/0/deeplink/compose?${new URLSearchParams({ subject: s.subject, body: mailBody })}`,
  };
  Object.entries(webmail).forEach(([label, href]) => {
    const b = el('button', 'rs-share-mailopt', label);
    b.type = 'button';
    b.onclick = () => {
      const win = window.open(href(), '_blank');
      if (win) win.opener = null;
      else status.textContent = s.blocked;
    };
    mailAlt.append(b);
  });
  const copyMsg = el('button', 'rs-share-mailopt', s.copyMessage);
  copyMsg.type = 'button';
  copyMsg.onclick = async () => {
    copyMsg.textContent = (await copyText(`${s.subject}\n\n${mailBody}`, mailAlt)) ? s.copied : 'Ctrl+C';
    setTimeout(() => { copyMsg.textContent = s.copyMessage; }, 2000);
  };
  mailAlt.append(copyMsg);

  const field = el('input', 'rs-share-link');
  field.type = 'text';
  field.readOnly = true;
  field.value = url;
  field.setAttribute('aria-label', s.copy);

  const actions = el('div', 'rs-share-actions');
  const copyBtn = el('button', 'rs-share-copy', s.copy);
  copyBtn.type = 'button';
  const downloadBtn = el('button', 'rs-share-download', s.download);
  downloadBtn.type = 'button';
  downloadBtn.onclick = () => {
    // a detached link: page-level click handlers never see this click
    const a = document.createElement('a');
    a.href = image;
    a.download = 'my-3m-design.png';
    a.click();
  };
  actions.append(copyBtn, downloadBtn);

  dialog.append(closeBtn, heading, preview, social, mailAlt, field, actions, status);
  document.body.append(dialog);
  closeBtn.onclick = () => dialog.close();

  copyBtn.onclick = async () => {
    onEvent('copy_link');
    copyBtn.textContent = (await copyText(url, dialog)) ? s.copied : 'Ctrl+C';
    setTimeout(() => { copyBtn.textContent = s.copy; }, 2000);
  };

  dialog.showModal();
  return {
    // hosted snapshot from the share webhook: link it from the email
    uploaded(link) {
      mailBody = `${text}\n\n${url}\n\n${link}`;
    },
    // the design link and local download still work without the upload
    failed() {},
  };
}

const THREE_MODULES = [
  '',
  '/examples/jsm/loaders/GLTFLoader.js',
  '/examples/jsm/controls/OrbitControls.js',
  '/examples/jsm/environments/RoomEnvironment.js',
];

async function loadThree() {
  const [THREE, gltfMod, ctrlMod, envMod] = await Promise.all(
    THREE_MODULES.map((path) => import(/* webpackIgnore: true */ `${CDN}${path}`)),
  );
  return {
    THREE,
    GLTFLoader: gltfMod.GLTFLoader,
    OrbitControls: ctrlMod.OrbitControls,
    RoomEnvironment: envMod.RoomEnvironment,
  };
}

// Puts what the stage first needs (three.js, the backdrop, the opening car and
// the night sky) in the browser cache at low priority, without running any of
// it: downloads happen off the main thread, so the page stays responsive and
// the stage starts quickly once it is wanted.
function warmStage(vehicle) {
  const prefetch = (href, crossOrigin) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (crossOrigin) link.crossOrigin = 'anonymous';
    document.head.append(link);
  };
  // esm.sh entry points are one-line stubs naming the files that hold the code
  THREE_MODULES.forEach((path) => {
    fetch(`${CDN}${path}`, { priority: 'low' })
      .then((res) => (res.ok ? res.text() : ''))
      .then((src) => (src.match(/"\/[^"]+\.m?js"/g) || [])
        .forEach((file) => prefetch(new URL(file.slice(1, -1), CDN).href, true)))
      .catch(() => {});
  });
  [
    'backdrop.glb',
    `textures/${THEMES.light.backdrop}`,
    `textures/${THEMES.dark.backdrop}`,
    ...['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((side) => `textures/night/${side}.webp`),
    vehicle.model,
    vehicle.ppf,
    `colormaps/${vehicle.colorMap}`,
  ].forEach((file) => prefetch(`${BASE}/${file}`));
  prefetch(new URL('./looks.js', import.meta.url).href);
}

// name → meshes: a named node and every mesh under it (a node whose mesh has
// several materials loads as a group of meshes with suffixed names)
function meshesByName(root, names) {
  const wanted = new Set(names);
  const found = {};
  root.traverse((o) => {
    if (!wanted.has(o.name)) return;
    o.traverse((m) => {
      if (m.isMesh) (found[o.name] ||= []).push(m);
    });
  });
  return found;
}

// Model materials the original studio draws with the vehicle's color map
// (baked trim, chrome, tyre and rim detail). Materials listed in KEEP_LOOK
// (paint, glass, lights, interior) keep their own look.
const KEEP_LOOK = ['carpaint', 'windowglass', 'headlightglass', 'lights', 'lightsred',
  'lightsorange', 'interior', 'sunroof', 'blackmapless', 'blackinterior'];

function colorMapped(THREE, m, map) {
  const name = (m.name || '').toLowerCase();
  if (name === 'black') return new THREE.MeshBasicMaterial({ name: m.name, color: 0xffffff, map });
  if (name === 'tire') return new THREE.MeshBasicMaterial({ name: m.name, color: 0xcccccc, map });
  if (name === 'chrome') {
    return new THREE.MeshStandardMaterial({
      name: m.name, map, metalness: 1, roughness: 0.31,
    });
  }
  if (['redglass', 'redglass.gt', 'clearglass', 'orangeglass'].includes(name)) {
    m.map = map;
    m.transparent = true;
    m.needsUpdate = true;
    return m;
  }
  return new THREE.MeshStandardMaterial({ name: m.name, map });
}

// Prepare one vehicle: wrappable materials per part, tint glass and the
// paint protection overlay with its coverage tiers.
async function prepareVehicle(THREE, loader, vehicle) {
  const glasses = [];
  const meshOfMat = new Map();
  // part → physical materials of its meshes (primer grey until wrapped)
  const partMats = Object.fromEntries(Object.keys(vehicle.parts).map((p) => [p, []]));
  const [gltf, colorMap] = await Promise.all([
    loader.loadAsync(`${BASE}/${vehicle.model}`),
    new THREE.TextureLoader().loadAsync(`${BASE}/colormaps/${vehicle.colorMap}`).catch(() => null),
  ]);
  const model = gltf.scene;
  if (colorMap) {
    // glTF texture coordinates: no vertical flip
    colorMap.flipY = false;
    colorMap.colorSpace = THREE.SRGBColorSpace;
  }
  const mapped = new Map();
  const partOfMesh = new Map();
  Object.entries(vehicle.parts).forEach(([part, names]) => {
    Object.values(meshesByName(model, names)).flat().forEach((m) => partOfMesh.set(m, part));
  });
  model.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    o.castShadow = true;
    const part = partOfMesh.get(o);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (part) {
      const swapped = mats.map(() => {
        const mat = new THREE.MeshPhysicalMaterial({
          color: PRIMER.color,
          metalness: PRIMER.metalness,
          roughness: PRIMER.roughness,
          clearcoat: PRIMER.clearcoat,
          clearcoatRoughness: 0.06,
        });
        addFlip(THREE, mat);
        partMats[part].push(mat);
        meshOfMat.set(mat, o);
        return mat;
      });
      o.material = Array.isArray(o.material) ? swapped : swapped[0];
      return;
    }
    mats.forEach((m) => {
      if (m.name === GLASS_MAT) {
        m.transparent = true;
        m.opacity = 0.35;
        glasses.push(m);
      }
    });
    if (colorMap) {
      const swapped = mats.map((m) => {
        if (KEEP_LOOK.includes((m.name || '').toLowerCase())) return m;
        if (!mapped.has(m)) mapped.set(m, colorMapped(THREE, m, colorMap));
        return mapped.get(m);
      });
      o.material = Array.isArray(o.material) ? swapped : swapped[0];
    }
  });

  // Each accent piece (stripes, trim) sits on a body part; unwrapped, it takes
  // that part's look so it blends in, as on the original. Host = the part of
  // the same-named panel (gt_accent_hood → gt_hood), else the body part whose
  // meshes overlap it most (nearest one if none overlap).
  const accentHost = new Map();
  const partOfName = Object.fromEntries(Object.entries(vehicle.parts)
    .filter(([part]) => part !== 'accents')
    .flatMap(([part, names]) => names.map((n) => [n, part])));
  const boxOf = (mat) => new THREE.Box3().setFromObject(meshOfMat.get(mat));
  const bodyBoxes = Object.entries(partMats).filter(([part]) => part !== 'accents')
    .flatMap(([part, mats]) => mats.map((m) => [part, boxOf(m)]));
  (partMats.accents || []).forEach((mat) => {
    const mesh = meshOfMat.get(mat);
    const name = vehicle.parts.accents.find((n) => n === mesh.name || n === mesh.parent?.name);
    const named = name && partOfName[name.replace('_accent', '')];
    if (named) {
      accentHost.set(mat, named);
      return;
    }
    const box = boxOf(mat);
    const center = box.getCenter(new THREE.Vector3());
    let best = null;
    let bestScore = -Infinity;
    bodyBoxes.forEach(([part, other]) => {
      const overlap = box.clone().intersect(other);
      const size = overlap.isEmpty() ? null : overlap.getSize(new THREE.Vector3());
      const score = size ? size.x * size.y * size.z + 1e3 : -other.distanceToPoint(center);
      if (score > bestScore) {
        bestScore = score;
        best = part;
      }
    });
    if (best) accentHost.set(mat, best);
  });

  // PPF overlay: parented under the car so it inherits the same transform.
  let ppfMeshes = {};
  const ppfMats = new Set();
  try {
    const ppf = (await loader.loadAsync(`${BASE}/${vehicle.ppf}`)).scene;
    ppf.traverse((o) => {
      if (!o.isMesh) return;
      o.visible = false;
      if (o.material) {
        o.material.transparent = true;
        ppfMats.add(o.material);
      }
    });
    ppfMeshes = meshesByName(ppf, Object.values(vehicle.ppfTiers).flat());
    model.add(ppf);
  } catch (e) {
    // the overlay is optional: paint protection then only changes the sheen
  }
  // coverage tiers this car offers (cumulative mesh lists)
  const tiers = Object.fromEntries(Object.entries(vehicle.ppfTiers)
    .map(([tier, names]) => [tier, names.flatMap((n) => ppfMeshes[n] || [])])
    .filter(([, meshes]) => meshes.length));

  // center the car; the floor goes to its base
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  return {
    vehicle,
    model,
    glasses,
    partMats,
    accentHost,
    ppfMeshes: Object.values(ppfMeshes).flat(),
    ppfMats: [...ppfMats],
    tiers,
    floorY: box.min.y - center.y,
    radius: box.getSize(new THREE.Vector3()).length() / 2,
  };
}

// Build the 3D scene and return a small API the UI drives.
// label: what screen readers announce for the 3D picture
async function initStage(stage, label) {
  // the film looks only matter for the 3D scene, so they load with it
  const [{
    THREE, GLTFLoader, OrbitControls, RoomEnvironment,
  }, { PRESET_LOOK, FILM_LOOK }] = await Promise.all([loadThree(), import('./looks.js')]);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // the 3D view is a picture to assistive tech; the view and part buttons
  // are its keyboard controls
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', label);
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envDay = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envDay;
  scene.background = new THREE.Color(THEMES.light.bg);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(...VIEWS.side);

  const controls = new OrbitControls(camera, renderer.domElement);
  // visitors who ask for less motion get no glide and instant camera moves
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  controls.enableDamping = !reduceMotion.matches;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI / 2.05;

  // Frames are drawn only when something changed (camera, design, textures,
  // size) and the stage is on screen: an idle studio costs no CPU, which
  // keeps the page responsive on slow phones.
  let frame = 0;
  let onScreen = true;
  // eslint-disable-next-line no-use-before-define
  const invalidate = () => { if (!frame && onScreen) frame = requestAnimationFrame(draw); };
  controls.addEventListener('change', invalidate);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    invalidate();
  }).observe(stage);

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight || Math.round(w * 0.6);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // resizing clears the canvas
    invalidate();
  }
  resize();
  new ResizeObserver(resize).observe(stage);

  // camera flights: ease the direction and distance toward a target position
  let flight = null;
  controls.addEventListener('start', () => { flight = null; });
  function flyTo(target, ms = 700) {
    flight = {
      from: camera.position.clone(),
      to: target,
      t0: performance.now(),
      ms: reduceMotion.matches ? 0 : ms,
    };
    invalidate();
  }

  function draw() {
    frame = 0;
    let moving = false;
    if (flight) {
      const k = flight.ms ? Math.min(1, (performance.now() - flight.t0) / flight.ms) : 1;
      const e = k < 0.5 ? 2 * k * k : 1 - ((-2 * k + 2) ** 2) / 2;
      const dir = flight.from.clone().normalize()
        .lerp(flight.to.clone().normalize(), e).normalize();
      const len = flight.from.length() + (flight.to.length() - flight.from.length()) * e;
      camera.position.copy(dir.multiplyScalar(len));
      if (k === 1) flight = null;
      moving = true;
    }
    // true while the camera still glides (damping) after a drag
    if (controls.update()) moving = true;
    renderer.render(scene, camera);
    if (moving) invalidate();
  }

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

  // the car's shadow lands on an invisible floor over the baked backdrop
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 40),
    new THREE.ShadowMaterial({ opacity: 0.3 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // textures (tiled film detail, backdrop), one per file and tiling
  const texLoader = new THREE.TextureLoader();
  const textures = {};
  function texture(file, { repeat = 1, stretch = 1, color = false } = {}) {
    const id = `${file}@${repeat}x${stretch}`;
    if (!textures[id]) {
      const tex = texLoader.load(`${BASE}/textures/${file}`, invalidate);
      // glTF texture coordinates: no vertical flip
      tex.flipY = false;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(repeat * stretch, repeat);
      if (color) tex.colorSpace = THREE.SRGBColorSpace;
      textures[id] = tex;
    }
    return textures[id];
  }

  // Models are quantized (KHR_mesh_quantization), which three.js reads natively:
  // decoders that need WebAssembly are blocked by the site's CSP.
  const loader = new GLTFLoader();

  // the original's curved "infinity" studio backdrop with baked day/night light
  const backdropMat = new THREE.MeshBasicMaterial({
    map: texture(THEMES.light.backdrop, { color: true }),
  });
  // loaded up front: every snapshot uses it
  const nightBackdrop = texture(THEMES.dark.backdrop, { color: true });
  let backdrop = null;
  try {
    backdrop = (await loader.loadAsync(`${BASE}/backdrop.glb`)).scene;
    backdrop.traverse((o) => { if (o.isMesh) o.material = backdropMat; });
  } catch (e) {
    // without it the plain background color shows
  }

  // night reflections from the original's night sky box, loaded on first use
  let envNight = null;
  function nightEnv() {
    envNight ||= new THREE.CubeTextureLoader().setPath(`${BASE}/textures/night/`)
      .loadAsync(['px.webp', 'nx.webp', 'py.webp', 'ny.webp', 'pz.webp', 'nz.webp'])
      .then((cube) => {
        cube.colorSpace = THREE.SRGBColorSpace;
        return pmrem.fromCubemap(cube).texture;
      });
    return envNight;
  }
  const cache = {};
  let car = null;
  let dist = 6;

  let coverage = 'platinum';
  let ppfActive = false;

  function showPPF() {
    if (!car) return;
    car.ppfMeshes.forEach((m) => { m.visible = false; });
    const tier = car.tiers[coverage] ? coverage : Object.keys(car.tiers).pop();
    if (ppfActive && tier) car.tiers[tier].forEach((m) => { m.visible = true; });
  }

  async function setTheme(mode) {
    const t = THEMES[mode] || THEMES.light;
    scene.background.set(t.bg);
    backdropMat.map = texture(t.backdrop, { color: true });
    backdropMat.needsUpdate = true;
    hemi.intensity = t.ambient;
    key.intensity = t.key;
    renderer.toneMappingExposure = t.exposure;
    scene.environment = mode === 'dark' ? await nightEnv().catch(() => envDay) : envDay;
  }

  // a position in the original studio's units → ours, keeping its direction
  // and its distance relative to the car's start position
  function fromOriginal(vec) {
    const v = new THREE.Vector3(...vec);
    const scale = v.length() / new THREE.Vector3(...car.vehicle.start).length();
    return v.normalize().multiplyScalar(THREE.MathUtils.clamp(
      dist * scale,
      controls.minDistance,
      controls.maxDistance,
    ));
  }

  const api = {
    // Capture the current view as a base64 data URL. WebGL clears the drawing
    // buffer after each frame, so force a fresh render and read it back in the
    // same call stack (no preserveDrawingBuffer needed).
    // The snapshot uses the vehicle's own camera position and, like the
    // original, always the night backdrop (the lighting stays as it is).
    capture(type = 'image/png', quality = 0.92) {
      const before = camera.position.clone();
      const shot = car && (camera.aspect < 1 ? car.vehicle.shotPortrait : car.vehicle.shot);
      if (shot) {
        camera.position.copy(fromOriginal(shot));
        camera.lookAt(controls.target);
      }
      const { map } = backdropMat;
      const bg = scene.background.clone();
      backdropMat.map = nightBackdrop;
      scene.background.set(THEMES.dark.bg);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL(type, quality);
      backdropMat.map = map;
      scene.background.copy(bg);
      camera.position.copy(before);
      camera.lookAt(controls.target);
      return url;
    },
    setTheme,
    /**
     * Show a vehicle (loaded once, then cached) and frame it.
     * @returns {Promise<string[]>} the paint protection tiers it offers
     */
    async loadVehicle(vehicle) {
      if (!cache[vehicle.key]) cache[vehicle.key] = prepareVehicle(THREE, loader, vehicle);
      const next = await cache[vehicle.key];
      if (car) scene.remove(car.model);
      car = next;
      scene.add(car.model);
      // the backdrop sits at the original's origin, like the car
      if (backdrop) car.model.add(backdrop);
      floor.position.y = car.floorY;
      dist = car.radius / Math.sin((camera.fov * Math.PI) / 360);
      controls.minDistance = dist * 0.55;
      controls.maxDistance = dist * 1.6;
      camera.position.setLength(dist);
      controls.target.set(0, 0, 0);
      controls.update();
      showPPF();
      return Object.keys(car.tiers);
    },
    /**
     * Show a whole design: wraps per part, window tint and paint protection.
     * @param {{ parts: object, tint: object, ppf: object, coverage: string }} d
     */
    applyDesign(d) {
      if (!car) return;
      const matte = d.ppf && d.ppf.finish === 'Matte';
      // a film's look on a part: base PBR plus flake / brushed / carbon detail,
      // colour textures and flip colours
      const styleFor = (film) => {
        const pbr = film
          ? (PRESET_PBR[film.preset] || FINISH_PBR[film.finish] || DEFAULT_PBR)
          : PRIMER;
        const look = (film && (FILM_LOOK[film.id] || PRESET_LOOK[film.preset])) || {};
        const tiling = { repeat: look.repeat || 1, stretch: look.stretch || 1 };
        // the brushed-metal streak texture works as roughness, keeping the film's grey
        const streaks = look.map && look.map.endsWith('roughness');
        const rough = look.rough || (streaks && look.map);
        const map = look.map && !streaks
          ? texture(`${look.map}.webp`, { ...tiling, color: true }) : null;
        let { color } = PRIMER;
        // full-colour textures carry their own colours
        if (film) color = map ? '#ffffff' : film.color;
        return {
          film,
          pbr,
          look,
          color,
          map,
          normalMap: look.normal ? texture(`${look.normal}.webp`, tiling) : null,
          roughnessMap: rough ? texture(`${rough}.webp`, tiling) : null,
        };
      };
      const styles = new Map();
      const style = (film) => {
        if (!styles.has(film)) styles.set(film, styleFor(film));
        return styles.get(film);
      };
      Object.entries(car.partMats).forEach(([part, list]) => {
        list.forEach((mat) => {
          // unwrapped accents blend into the part they sit on
          const film = part === 'accents' && !d.parts.accents
            ? d.parts[car.accentHost.get(mat)] : d.parts[part];
          const {
            pbr, look, color, map, normalMap, roughnessMap,
          } = style(film);
          mat.color.set(color);
          mat.map = map;
          mat.normalMap = normalMap;
          if (normalMap) mat.normalScale.set(look.scale ?? 1, look.scale ?? 1);
          mat.roughnessMap = roughnessMap;
          mat.anisotropy = film && film.preset === 'brushed-metal' ? 0.7 : 0;
          mat.metalness = pbr.metalness;
          // matte PPF also flattens the sheen of whatever is underneath
          mat.roughness = matte ? Math.max(pbr.roughness, 0.8) : pbr.roughness;
          mat.clearcoat = matte ? Math.min(pbr.clearcoat, 0.15) : pbr.clearcoat;
          const { flip } = mat.userData;
          flip.rsFlipAmount.value = look.flip ? 1 : 0;
          if (look.flip) {
            const [from, to, strength] = look.flip;
            flip.rsFlipA.value.set(from);
            flip.rsFlipB.value.set(to);
            flip.rsFlipStrength.value = strength;
          }
          mat.needsUpdate = true;
        });
      });
      if (d.tint) {
        // darker tints carry a higher opacity in the sheet
        const opacity = parseFloat(d.tint.opacity) || 0.55;
        car.glasses.forEach((g) => { g.color.set(d.tint.color); g.opacity = opacity; });
      } else {
        car.glasses.forEach((g) => { g.color.set(0x0d1a17); g.opacity = 0.35; });
      }
      if (d.ppf) {
        // clear glossy film, or a translucent matte film over the paint
        car.ppfMats.forEach((m) => {
          m.color.set(matte ? 0xd7d7d7 : 0xffffff);
          m.opacity = matte ? 0.22 : 0.1;
          m.roughness = matte ? 0.95 : 0.04;
          m.metalness = 0;
          m.needsUpdate = true;
        });
      }
      ppfActive = !!d.ppf;
      coverage = d.coverage;
      showPPF();
    },
    setView(name, animate = true) {
      const target = new THREE.Vector3(...(VIEWS[name] || VIEWS.side)).setLength(dist);
      if (animate) flyTo(target);
      else {
        camera.position.copy(target);
        controls.update();
      }
    },
    // turn to a part the way the original studio does
    focusPart(part) {
      const cam = car && car.vehicle.cams[part];
      if (cam) flyTo(fromOriginal(cam));
    },
  };
  // every call changes what the stage shows: draw it (again once async work ends)
  Object.entries(api).forEach(([name, fn]) => {
    api[name] = (...args) => {
      const out = fn(...args);
      invalidate();
      if (out instanceof Promise) out.then(invalidate, invalidate);
      return out;
    };
  });
  return api;
}

// Small yes/no dialog (styled like the share dialog); resolves true on confirm.
function confirmDialog({
  title, text, confirm, cancel,
}) {
  return new Promise((resolve) => {
    const heading = el('h3', 'rs-share-heading', title);
    // Esc or a click outside leave returnValue empty: the same as Cancel
    const dialog = openModal('rs-share-dialog rs-confirm', heading, {
      role: 'alertdialog', onClose: (value) => resolve(value === 'confirm'),
    });
    dialog.append(heading, el('p', 'rs-confirm-text', text));
    const actions = el('div', 'rs-share-actions');
    const no = el('button', 'rs-share-copy', cancel);
    const yes = el('button', 'rs-share-download', confirm);
    no.type = 'button';
    yes.type = 'button';
    actions.append(no, yes);
    dialog.append(actions);
    document.body.append(dialog);
    no.onclick = () => dialog.close('cancel');
    yes.onclick = () => dialog.close('confirm');
    yes.autofocus = true;
    dialog.showModal();
  });
}

function emptyDesign(coverage = 'platinum') {
  return {
    parts: {}, tint: null, ppf: null, coverage,
  };
}

// the film on every body part, if they all share one
function entireFilm(d) {
  const body = BODY_PARTS.map((p) => d.parts[p]);
  return body.every((f) => f && f === body[0]) ? body[0] : null;
}

// put a film on the design: wraps go to a part (or every body part)
function placeFilm(d, film, target) {
  if (WRAP_PRODUCTS.includes(film.product)) {
    if (target === 'all') BODY_PARTS.forEach((p) => { d.parts[p] = film; });
    else d.parts[target] = film;
  } else if (film.product === 'Window Tint') d.tint = film;
  else d.ppf = film;
}

function encodeDesign(d) {
  const out = [];
  const add = (key, film) => out.push(`${key}:${encodeURIComponent(film.id)}`);
  const entire = entireFilm(d);
  if (entire) add('e', entire);
  else BODY_PARTS.forEach((p) => { if (d.parts[p]) add(PART_CODES[p], d.parts[p]); });
  if (d.parts.accents) add('a', d.parts.accents);
  if (d.tint) add('w', d.tint);
  if (d.ppf) add('p', d.ppf);
  return out.join(',') || '-';
}

function decodeDesign(code, byId) {
  const d = emptyDesign();
  if (!code.includes(':')) {
    // older links: one film id
    if (byId[code]) placeFilm(d, byId[code], 'all');
    return d;
  }
  const partOf = Object.fromEntries(Object.entries(PART_CODES).map(([p, c]) => [c, p]));
  code.split(',').forEach((pair) => {
    const [key, id] = pair.split(':');
    const film = byId[id];
    if (!film) return;
    if (key === 'e') BODY_PARTS.forEach((p) => { d.parts[p] = film; });
    else if (key === 'w') d.tint = film;
    else if (key === 'p') d.ppf = film;
    else if (partOf[key]) d.parts[partOf[key]] = film;
  });
  return d;
}

// a link shared from the original studio: vehicle, tint, accent (2), D/N scene,
// one wrap (2) per part in its order, then an optional paint protection film
const ORIGINAL_HASH = /^#d\/([A-Z0-9-]{17,18})$/i;
const ORIGINAL_PART_ORDER = ['front', 'hood', 'left', 'right', 'top', 'rear'];

function decodeOriginal(code, byId, lang, codes) {
  const { ORIGINAL_WRAPS, ORIGINAL_TINTS, ORIGINAL_FILMS } = codes;
  const c = code.toUpperCase();
  const vehicle = VEHICLES.find((v) => v.code === c[0]);
  if (!vehicle) return null;
  const d = emptyDesign();
  const wrap = (key) => byId[ORIGINAL_WRAPS[key]];
  d.tint = byId[(ORIGINAL_TINTS[lang] || ORIGINAL_TINTS.en)[c[1]]] || null;
  if (wrap(c.slice(2, 4))) d.parts.accents = wrap(c.slice(2, 4));
  ORIGINAL_PART_ORDER.forEach((p, i) => {
    const film = wrap(c.slice(5 + 2 * i, 7 + 2 * i));
    if (film) d.parts[p] = film;
  });
  const [coverage, ppf] = ORIGINAL_FILMS[c[17]] || [];
  if (byId[ppf]) {
    d.ppf = byId[ppf];
    d.coverage = coverage;
  }
  // "P" marks a snapshot taken in the night scene
  return { design: d, vehicle, theme: c[4] === 'D' ? 'light' : 'dark' };
}

// the original's share sentence: one, two or many wraps, plus the tint
function designText(d, str) {
  const names = [...new Set([...BODY_PARTS, 'accents'].map((p) => d.parts[p]).filter(Boolean)
    .map((f) => f.name))];
  const tint = d.tint && d.tint.name;
  if (!names.length) return tint ? str.tintOnly.replace('[tint]', tint) : str.none;
  const template = [str.single, str.two][names.length - 1] || str.many;
  const text = template.replace('[wrap1]', names[0]).replace('[wrap2]', names[1]);
  return tint ? `${text} ${str.tintSuffix.replace('[tint]', tint)}` : text;
}

export default async function decorate(block) {
  const cfg = readConfig(block);
  const seg = (window.location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  const lang = LANGS.includes(seg) ? seg : 'en';
  const t = I18N[lang] || I18N.en;
  const ui = STUDIO_I18N[lang] || STUDIO_I18N.en;
  const shareStr = SHARE_I18N[lang] || SHARE_I18N.en;
  const langSheet = `/${lang}/consumer/films.json`;
  // A market catalogue shipped with the code (/films-{lang}.json) wins, then
  // the language's authored sheet; translated pages often keep the master's
  // source path, and the root sheet is the last fallback.
  const sources = [...new Set([
    lang !== 'en' && `/films-${lang}.json`, lang !== 'en' && langSheet,
    cfg.source || langSheet, '/films.json',
  ].filter(Boolean))];
  const title = cfg.title || '3M Restyling Studio Visualizer';

  block.textContent = '';
  block.classList.add('rs-visualizer');

  const stage = el('div', 'rs-stage');
  let activeTheme = 'dark'; // the original opens in its night scene
  const themeBar = el('div', 'rs-theme');
  [['light', ui.lightBg, '☀'], ['dark', ui.darkBg, '☾']].forEach(([mode, label, icon]) => {
    const b = el('button', `rs-theme-btn${mode === activeTheme ? ' is-active' : ''}`, icon);
    b.setAttribute('aria-pressed', String(mode === activeTheme));
    b.type = 'button';
    b.dataset.theme = mode;
    b.title = label;
    b.setAttribute('aria-label', label);
    themeBar.append(b);
  });
  stage.append(themeBar);

  const viewbar = el('div', 'rs-viewbar');
  ['side', 'front', 'rear'].forEach((v, i) => {
    const b = el('button', `rs-view${i === 0 ? ' is-active' : ''}`, ui.views[v]);
    b.setAttribute('aria-pressed', String(i === 0));
    b.type = 'button';
    b.dataset.view = v;
    viewbar.append(b);
  });
  const caption = el('div', 'rs-caption', t.loading);

  const panel = el('aside', 'rs-panel-ui');
  panel.append(el('h2', 'rs-title', title));
  const productTabs = el('div', 'rs-tabs');
  const partRow = el('div', 'rs-parts');
  const finishRow = el('div', 'rs-filters');
  const coverageRow = el('div', 'rs-coverage');
  const grid = el('div', 'rs-grid');
  const detail = el('div', 'rs-detail');
  const designBox = el('div', 'rs-design');
  const actionRow = el('div', 'rs-actions');
  // opens the locator as a full-screen takeover (shared with the locator block)
  const cta = el('button', 'rs-cta button', t.findInstaller);
  cta.type = 'button';
  const openLocator = async () => {
    const { openLocatorModal } = await import('../locator/locator.js');
    openLocatorModal({
      source: cfg.installers,
      title: t.findInstaller,
      // the locator's searches and shop clicks, as the original reports them
      onEvent: (key, fields) => studioEvent(key, {
        stage: 'service_locator',
        ...(key === 'search' && { data_tracking_event: 'post_code_lookup' }),
        ...fields,
        // coordinates are never sent, only that a location was searched
        ...(fields.Internal_search_term && {
          Internal_search_term: COORDS.test(fields.Internal_search_term)
            ? '[lat]/[lon]' : fields.Internal_search_term,
        }),
      }),
    });
  };
  cta.onclick = () => {
    studioEvent('installer');
    openLocator();
  };
  // captures the current 3D view, posts it to the Fusion share webhook and
  // opens the share dialog with a link that reopens this design
  const share = el('button', 'rs-share button', shareStr.button);
  share.type = 'button';
  const done = el('button', 'rs-done button', ui.done);
  done.type = 'button';
  actionRow.append(cta, share, done);
  // product information pages, as linked from the original studio
  const infoRow = el('div', 'rs-info');
  infoRow.append(el('span', 'rs-info-label', ui.moreInfo));
  (INFO_LINKS[lang] || INFO_LINKS.en).forEach(([label, href]) => {
    const b = el('button', 'rs-info-link', `${label} ↗`);
    b.type = 'button';
    b.onclick = () => {
      const win = window.open(href, '_blank');
      if (win) win.opener = null;
    };
    infoRow.append(b);
  });
  panel.append(
    productTabs,
    partRow,
    finishRow,
    coverageRow,
    grid,
    detail,
    designBox,
    actionRow,
    infoRow,
  );

  // vehicle picker ("Change Vehicle"), the original's five cars
  const vehicleBar = el('div', 'rs-vehicles');
  vehicleBar.setAttribute('role', 'group');
  vehicleBar.setAttribute('aria-label', ui.changeVehicle);

  const stageWrap = el('div', 'rs-stagewrap');
  stageWrap.append(stage, viewbar, caption, vehicleBar);
  block.append(stageWrap, panel);

  // load the language sheet; fall back to the root editing master
  async function loadFilms(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json();
    return json.data || json;
  }
  let films = [];
  for (let i = 0; i < sources.length && !films.length; i += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      films = await loadFilms(sources[i]);
    } catch (e) {
      // try the next sheet
    }
  }
  if (!films.length) {
    grid.textContent = 'Could not load the film catalog.';
    return;
  }

  let viewer = null;
  const byId = Object.fromEntries(films.map((f) => [f.id, f]));
  const products = [...new Set(films.map((f) => f.product))];
  let activeProduct = products[0];
  let activeFinish = 'All';
  let activeView = 'side';
  // the part the wrap tabs apply to: 'all' (entire vehicle) or a PARTS key
  let target = 'all';
  let design = emptyDesign();
  let vehicle = VEHICLES.find((v) => v.key === DEFAULT_VEHICLE);
  // paint protection coverage tiers the current vehicle offers
  let tiers = [];
  const canHover = window.matchMedia('(hover: hover)').matches;
  // the design in the original's analytics format: vehicle plus each layer's film
  // the original's event for choosing (or clearing, film = null) a layer
  function trackSelection(product, part, film) {
    const details = { event_details: film ? film.code : NO_SELECTION };
    const material = activeFinish === 'All' ? 'All Materials' : activeFinish;
    if (product === 'Window Tint') studioEvent('tint', details);
    else if (product === 'Paint Protection Film') {
      studioEvent('ppf', {
        suffix: film ? film.finish : NO_SELECTION,
        event_details: film ? `${PPF_EVENT_CODE[design.coverage]}${film.finish[0]}` : NO_SELECTION,
      });
    } else if (part === 'accents') studioEvent('accent', { suffix: material, ...details });
    else {
      const placement = part === 'all' ? STUDIO_I18N.en.entire : STUDIO_I18N.en.parts[part];
      studioEvent(product === 'Protection Wrap Film' ? 'pwf' : 'wrap', {
        suffix: `${placement} - ${material}`, ...details,
      });
    }
  }
  // touch screens pinch to zoom; mice scroll
  const dragHint = window.matchMedia('(pointer: coarse)').matches ? t.dragTouch : t.drag;

  // the location hash, as shared (apps that re-encode links turn "~" into "%7E")
  function sharedHash() {
    try {
      return decodeURIComponent(window.location.hash);
    } catch (e) {
      return window.location.hash; // malformed escape: match the raw hash
    }
  }
  // the original studio's share codes, loaded only when such a link is opened
  let originalCodes = null;
  async function loadOriginalCodes() {
    if (!originalCodes && ORIGINAL_HASH.test(sharedHash())) {
      originalCodes = await import('./share-codes.js');
    }
  }

  // a shared design link (#d/…) restores its layers, coverage, view and theme
  function readSharedLink() {
    const hash = sharedHash();
    const original = originalCodes && hash.match(ORIGINAL_HASH);
    const fromOriginal = original && decodeOriginal(original[1], byId, lang, originalCodes);
    const shared = !fromOriginal && hash.match(DESIGN_HASH);
    if (fromOriginal) {
      ({ design, vehicle, theme: activeTheme } = fromOriginal);
    } else if (shared) {
      design = decodeDesign(shared[1], byId);
      design.coverage = shared[2] || design.coverage;
      activeView = shared[3] || activeView;
      activeTheme = shared[4] || activeTheme;
      vehicle = VEHICLES.find((v) => v.code === shared[5]) || vehicle;
    } else return false;
    const first = [...BODY_PARTS, 'accents'].map((p) => design.parts[p]).find(Boolean)
      || design.tint || design.ppf;
    if (first) activeProduct = first.product;
    target = 'all';
    return true;
  }
  await loadOriginalCodes();
  readSharedLink();

  function designUrl() {
    const code = [encodeDesign(design), design.coverage, activeView, activeTheme, vehicle.code]
      .join('~');
    return `${window.location.origin}${window.location.pathname}#d/${code}`;
  }

  function finishesFor(product) {
    const finishes = [...new Set(films.filter((f) => f.product === product).map((f) => f.finish))];
    // wrap finishes are listed by their translated name, as in the original
    // eslint-disable-next-line no-use-before-define
    const byLabel = (a, b) => (finishLabel(a, product) < finishLabel(b, product) ? -1 : 1);
    if (WRAP_PRODUCTS.includes(product)) finishes.sort(byLabel);
    return ['All', ...finishes];
  }

  // Display labels come from the (translatable) sheet; logic uses stable keys.
  function productLabel(product) {
    const f = films.find((x) => x.product === product);
    return (f && f.productLabel) || product;
  }
  // a finish can be named differently per product (e.g. German "Gloss" for
  // wraps but "Glänzend" for paint protection), so look it up in its tab
  function finishLabel(finish, product = activeProduct) {
    if (finish === 'All') return t.all;
    const f = films.find((x) => x.finish === finish && x.product === product)
      || films.find((x) => x.finish === finish);
    return (f && f.finishLabel) || finish;
  }
  const isWrapTab = () => WRAP_PRODUCTS.includes(activeProduct);

  // the film the current tab (and part) holds in the design
  function assigned() {
    if (isWrapTab()) {
      const film = target === 'all' ? entireFilm(design) : design.parts[target];
      return film && film.product === activeProduct ? film : null;
    }
    if (activeProduct === 'Window Tint') return design.tint;
    if (activeProduct === 'Paint Protection Film') return design.ppf;
    return null;
  }

  function showDetail(film) {
    detail.textContent = '';
    const sw = el('div', 'rs-swatch-lg');
    const text = el('div');
    if (film) {
      sw.style.background = swatchBg(film);
      text.append(
        el('strong', '', film.name),
        el('span', 'rs-sku', film.code || film.id),
        el('p', '', film.hint || FINISH_HINT[film.finish] || ''),
      );
    } else {
      sw.classList.add('is-empty');
      text.append(el('strong', '', ui.noSelection), el('p', '', ui.preview));
    }
    detail.append(sw, text);
  }

  function markActive() {
    const film = assigned();
    grid.querySelectorAll('.rs-swatch').forEach((sEl) => {
      const on = !!film && sEl.dataset.id === film.id;
      sEl.classList.toggle('is-active', on);
      sEl.setAttribute('aria-pressed', String(on));
    });
  }

  function partLabel(part) {
    return part === 'all' ? ui.entire : ui.parts[part];
  }

  // "Your Design": one row per layer, each removable, plus Clear All
  function renderDesign(box = designBox, editable = true) {
    box.textContent = '';
    const head = el('div', 'rs-design-head');
    head.append(el('h3', 'rs-design-title', ui.yourDesign));
    const rows = [];
    const entire = entireFilm(design);
    if (entire) rows.push(['all', ui.entire, entire]);
    else {
      BODY_PARTS.filter((p) => design.parts[p])
        .forEach((p) => rows.push([p, ui.parts[p], design.parts[p]]));
    }
    if (design.parts.accents) rows.push(['accents', ui.parts.accents, design.parts.accents]);
    if (design.tint) rows.push(['tint', productLabel('Window Tint'), design.tint]);
    if (design.ppf) {
      const tier = t[design.coverage] || t.platinum;
      rows.push(['ppf', `${productLabel('Paint Protection Film')} · ${tier}`, design.ppf]);
    }
    if (editable && rows.length) {
      const clear = el('button', 'rs-design-clear', ui.clearAll);
      clear.type = 'button';
      clear.onclick = () => {
        design = emptyDesign(design.coverage);
        // eslint-disable-next-line no-use-before-define
        refresh();
      };
      head.append(clear);
    }
    box.append(head);
    const list = el('ul', 'rs-design-list');
    if (!rows.length) list.append(el('li', 'rs-design-empty', ui.noSelections));
    rows.forEach(([key, label, film]) => {
      const li = el('li', 'rs-design-row');
      const sw = el('span', 'rs-design-swatch');
      sw.style.background = swatchBg(film);
      const txt = el('span', 'rs-design-text');
      txt.append(el('span', 'rs-design-part', label), el('span', 'rs-design-film', film.name));
      li.append(sw, txt);
      if (editable) {
        const x = el('button', 'rs-design-remove', '×');
        x.type = 'button';
        x.setAttribute('aria-label', `${ui.remove}: ${label}`);
        x.onclick = () => {
          trackSelection(film.product, key, null);
          if (key === 'all') BODY_PARTS.forEach((p) => { delete design.parts[p]; });
          else if (key === 'tint') design.tint = null;
          else if (key === 'ppf') design.ppf = null;
          else delete design.parts[key];
          // eslint-disable-next-line no-use-before-define
          refresh();
        };
        li.append(x);
      }
      list.append(li);
    });
    box.append(list);
  }

  function refresh() {
    if (viewer) viewer.applyDesign(design);
    markActive();
    showDetail(assigned());
    renderDesign();
  }

  // hover preview: show a film on the car without committing it
  function preview(film) {
    const temp = { ...design, parts: { ...design.parts } };
    placeFilm(temp, film, target);
    if (viewer) viewer.applyDesign(temp);
    showDetail(film);
  }

  async function choose(film) {
    // sent before any confirmation, as the original does
    trackSelection(film.product, target, film);
    if (isWrapTab() && target === 'all') {
      // replacing different wraps on several parts needs a confirmation
      const current = new Set(BODY_PARTS.map((p) => design.parts[p]).filter(Boolean));
      if (current.size > 1 || (current.size === 1 && !entireFilm(design))) {
        const ok = await confirmDialog({
          title: ui.confirmTitle, text: ui.confirmText, confirm: ui.confirm, cancel: ui.cancel,
        });
        if (!ok) {
          refresh();
          return;
        }
      }
    }
    placeFilm(design, film, target);
    caption.textContent = [productLabel(film.product), film.series].filter(Boolean).join(' · ');
    refresh();
  }

  function renderTabs() {
    productTabs.textContent = '';
    products.forEach((p) => {
      const b = el('button', `rs-tab${p === activeProduct ? ' is-active' : ''}`, productLabel(p));
      b.setAttribute('aria-pressed', String(p === activeProduct));
      b.type = 'button';
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => {
        activeProduct = p;
        activeFinish = 'All';
        studioEvent('category', { event_details: CATEGORY_EVENT_NAME[p] || p });
        // eslint-disable-next-line no-use-before-define
        renderAll();
        // the original turns to the windows when its tint panel opens
        if (viewer && p === 'Window Tint') viewer.focusPart('windows');
      };
      productTabs.append(b);
    });
  }

  function renderParts() {
    partRow.textContent = '';
    partRow.style.display = isWrapTab() ? '' : 'none';
    if (!isWrapTab()) return;
    ['all', 'front', 'hood', 'left', 'top', 'right', 'rear', 'accents'].forEach((p) => {
      const b = el('button', `rs-part${p === target ? ' is-active' : ''}`, partLabel(p));
      b.setAttribute('aria-pressed', String(p === target));
      b.type = 'button';
      b.onclick = () => {
        target = p;
        renderParts();
        markActive();
        showDetail(assigned());
        // turn the car to the chosen part
        if (viewer) {
          if (p === 'all') viewer.setView(activeView);
          else viewer.focusPart(p);
        }
      };
      partRow.append(b);
    });
  }

  function renderFinishes() {
    finishRow.textContent = '';
    const finishes = finishesFor(activeProduct);
    // a single finish (e.g. window tint) needs no filter
    finishRow.style.display = finishes.length > 2 ? '' : 'none';
    finishes.forEach((f) => {
      const b = el('button', `rs-chip${f === activeFinish ? ' is-active' : ''}`, finishLabel(f));
      b.setAttribute('aria-pressed', String(f === activeFinish));
      b.type = 'button';
      if (FINISH_ICON[f]) {
        const icon = el('img', 'rs-chip-icon');
        icon.src = `${BASE}/icons/finish-${FINISH_ICON[f]}.webp`;
        icon.alt = '';
        b.prepend(icon);
      }
      // eslint-disable-next-line no-use-before-define
      b.onclick = () => { activeFinish = f; renderGrid(); };
      finishRow.append(b);
    });
  }

  function renderCoverage() {
    coverageRow.textContent = '';
    const isPPF = activeProduct === 'Paint Protection Film' && tiers.length;
    coverageRow.style.display = isPPF ? '' : 'none';
    if (!isPPF) return;
    coverageRow.append(el('span', 'rs-coverage-label', t.coverage));
    TIER_ORDER.filter((tier) => tiers.includes(tier)).forEach((tier) => {
      const label = t[tier];
      const b = el('button', `rs-chip${tier === design.coverage ? ' is-active' : ''}`, label);
      b.setAttribute('aria-pressed', String(tier === design.coverage));
      b.type = 'button';
      b.insertAdjacentHTML('afterbegin', shieldIcon(tier));
      b.onclick = () => {
        design.coverage = tier;
        // a new coverage is a new film in the original (e.g. FFM → FCM)
        if (design.ppf) trackSelection(design.ppf.product, 'all', design.ppf);
        renderCoverage();
        refresh();
      };
      coverageRow.append(b);
    });
  }

  function renderGrid() {
    renderParts();
    renderFinishes();
    renderCoverage();
    grid.textContent = '';
    const list = films.filter((f) => f.product === activeProduct
      && (activeFinish === 'All' || f.finish === activeFinish));
    list.forEach((f) => {
      const sEl = el('button', 'rs-swatch');
      sEl.type = 'button';
      sEl.dataset.id = f.id;
      sEl.title = `${f.name} (${f.code || f.id})`;
      sEl.style.background = swatchBg(f);
      sEl.setAttribute('aria-label', f.name);
      sEl.onclick = () => choose(f);
      if (canHover) {
        sEl.onmouseenter = () => preview(f);
        sEl.onmouseleave = () => refresh();
      }
      grid.append(sEl);
    });
    markActive();
    showDetail(assigned());
  }

  function renderAll() {
    renderTabs();
    renderGrid();
  }

  // a coverage tier the current vehicle doesn't offer falls back to Full Front
  function fitCoverage() {
    if (!tiers.length || tiers.includes(design.coverage)) return;
    design.coverage = tiers.includes('gold') ? 'gold' : tiers[tiers.length - 1];
  }

  function renderVehicles() {
    vehicleBar.textContent = '';
    VEHICLES.forEach((v) => {
      const b = el('button', `rs-vehicle${v === vehicle ? ' is-active' : ''}`);
      b.type = 'button';
      b.setAttribute('aria-pressed', v === vehicle);
      const img = el('img');
      img.src = `${BASE}/vehicles/${v.thumb}`;
      img.alt = '';
      img.loading = 'lazy';
      b.append(img, el('span', '', ui.vehicles[v.key]));
      b.onclick = () => {
        if (!viewer || v === vehicle) return;
        studioEvent('vehicle', { event_details: STUDIO_I18N.en.vehicles[v.key] });
        // eslint-disable-next-line no-use-before-define
        switchVehicle(v);
      };
      vehicleBar.append(b);
    });
  }

  // swap the car and keep the design: parts share the same keys on every car
  async function switchVehicle(v) {
    if (!viewer || v === vehicle) return;
    vehicle = v;
    renderVehicles();
    vehicleBar.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    caption.textContent = t.loading;
    try {
      tiers = await viewer.loadVehicle(vehicle);
      fitCoverage();
      viewer.setView(activeView, false);
      caption.textContent = dragHint;
    } catch (e) {
      caption.textContent = t.notLoaded;
    }
    vehicleBar.querySelectorAll('button').forEach((b) => { b.disabled = false; });
    renderCoverage();
    refresh();
  }

  viewbar.querySelectorAll('.rs-view').forEach((b) => {
    b.onclick = () => {
      viewbar.querySelectorAll('.rs-view').forEach((x) => {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      activeView = b.dataset.view;
      if (viewer) viewer.setView(activeView);
    };
  });

  themeBar.querySelectorAll('.rs-theme-btn').forEach((b) => {
    b.onclick = () => {
      activeTheme = b.dataset.theme;
      themeBar.querySelectorAll('.rs-theme-btn').forEach((x) => {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      if (viewer) viewer.setTheme(activeTheme);
      studioEvent('toggle', { event_details: activeTheme === 'dark' ? 'Night' : 'Day' });
    };
  });

  // funnel: the stage share events report (the studio or its finale)
  async function openShare(funnel) {
    if (!viewer) return;
    // no need to disable Share meanwhile: the open dialog makes the page inert
    // (disabling it would drop its focus, which the dialog returns to on close)
    const dataUrl = viewer.capture('image/png');
    const dialog = showShareDialog({
      s: shareStr,
      image: dataUrl,
      url: designUrl(),
      text: designText(design, shareStr),
      onEvent: (channel) => studioEvent('share', { event_context: channel, stage: funnel }),
    });
    try {
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
      if (!data || !data.downloadlink) throw new Error('no link');
      dialog.uploaded(data.downloadlink);
    } catch (e) {
      dialog.failed();
    }
  }
  share.onclick = () => openShare('studio');

  // "Done": the original's finale with the design and what to do next
  done.onclick = () => {
    if (!viewer) return;
    studioEvent('done', { stage: 'completed' });
    const image = viewer.capture('image/png');
    const heading = el('h3', 'rs-share-heading', ui.finaleTitle);
    const dialog = openModal('rs-share-dialog rs-finale', heading);
    const closeBtn = el('button', 'rs-share-close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', ui.close);
    closeBtn.autofocus = true;
    const img = el('img', 'rs-share-image');
    img.src = image;
    img.alt = designText(design, shareStr);
    const summary = el('div', 'rs-design rs-finale-design');
    renderDesign(summary, false);
    const buttons = el('div', 'rs-finale-actions');
    const close = () => dialog.close();
    [
      ['download', shareStr.download, () => {
        const a = document.createElement('a');
        a.href = image;
        a.download = 'my-3m-design.png';
        a.click();
      }],
      ['share', shareStr.button, () => { close(); openShare('completed'); }],
      ['installer', t.findInstaller, () => {
        close();
        studioEvent('installer', { stage: 'completed' });
        openLocator();
      }],
      ['restart', ui.restart, () => {
        close();
        design = emptyDesign(design.coverage);
        target = 'all';
        renderAll();
        refresh();
      }],
    ].forEach(([key, label, action]) => {
      const b = el('button', `rs-finale-btn rs-finale-${key}`, label);
      b.type = 'button';
      b.onclick = action;
      buttons.append(b);
    });
    dialog.append(closeBtn, heading, img, summary, buttons);
    document.body.append(dialog);
    closeBtn.onclick = close;
    dialog.showModal();
  };

  // reflect the theme and view (e.g. from a shared link) in the controls
  function syncControls() {
    themeBar.querySelectorAll('.rs-theme-btn').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.theme === activeTheme);
      b.setAttribute('aria-pressed', String(b.dataset.theme === activeTheme));
    });
    viewbar.querySelectorAll('.rs-view').forEach((b) => {
      b.classList.toggle('is-active', b.dataset.view === activeView);
      b.setAttribute('aria-pressed', String(b.dataset.view === activeView));
    });
  }

  // a design link pasted into a tab already showing the studio
  window.addEventListener('hashchange', async () => {
    const before = vehicle;
    await loadOriginalCodes();
    if (!readSharedLink()) return;
    syncControls();
    renderAll();
    if (viewer) {
      viewer.setTheme(activeTheme);
      if (vehicle !== before) {
        const next = vehicle;
        vehicle = before;
        switchVehicle(next);
        return;
      }
      viewer.setView(activeView);
    } else {
      // the 3D isn't up yet: show the link's car, and start it for the design
      renderVehicles();
      // eslint-disable-next-line no-use-before-define
      start();
    }
    refresh();
  });

  syncControls();
  renderVehicles();
  renderAll();
  renderDesign();

  async function startStage() {
    try {
      viewer = await initStage(stage, ui.stageLabel);
      const loaded = vehicle;
      tiers = await viewer.loadVehicle(loaded);
      fitCoverage();
      viewer.setTheme(activeTheme);
      viewer.setView(activeView, false);
      caption.textContent = dragHint;
      renderCoverage();
      refresh();
      // a design link opened while the stage loaded may ask for another car
      if (vehicle !== loaded) {
        const next = vehicle;
        vehicle = loaded;
        // eslint-disable-next-line no-use-before-define
        switchVehicle(next);
      }
    } catch (e) {
      stage.classList.add('rs-stage-error');
      caption.textContent = t.notLoaded;
    }
  }
  // The panel is ready now; the 3D scene (three.js, the car models) loads in
  // the background, so it never holds up the rest of the page. It starts as
  // soon as the stage is on screen, a design link is opened, or the visitor
  // first scrolls or touches the page (a head start before the stage shows).
  const WAKE_EVENTS = ['scroll', 'wheel', 'pointerdown', 'touchstart', 'keydown'];
  let started = false;
  // eslint-disable-next-line no-use-before-define
  const wake = () => start();
  const onScreenStage = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) wake();
  });
  function start() {
    if (started) return;
    started = true;
    onScreenStage.disconnect();
    WAKE_EVENTS.forEach((type) => window.removeEventListener(type, wake));
    startStage();
  }
  if (window.location.hash.startsWith('#d/')) start();
  else {
    onScreenStage.observe(stage);
    WAKE_EVENTS.forEach((type) => window.addEventListener(type, wake, { passive: true }));
    // meanwhile, once the page has loaded and gone quiet, fetch the stage's
    // files into the cache (skipped when the visitor asks to save data)
    const { connection } = navigator;
    const frugal = connection && (connection.saveData || /2g/.test(connection.effectiveType));
    const warm = () => {
      if (started || frugal) return;
      const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
      setTimeout(() => idle(() => { if (!started) warmStage(vehicle); }, { timeout: 3000 }), 3000);
    };
    if (document.readyState === 'complete') warm();
    else window.addEventListener('load', warm, { once: true });
  }
}
