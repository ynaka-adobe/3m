import {
  readBlockConfig, loadCSS, loadScript,
} from '../../scripts/aem.js';
import { createDealerApi, searchSample } from './dealer-api.js';

// default Marketo form design URL for the "Get a quote" modal (override per
// page with a `quote` config row on the block)
const DEFAULT_QUOTE = 'https://engage-ab.marketo.com/?munchkinId=860-YON-741#/ds/mktform/3';
const PAGE_SIZE = 10;
const RADIUS = {
  min: 10, max: 200, step: 10, value: 50,
};
const KM_PER_MILE = 1.609344;
// width of the list floating over the map; keep in sync with locator.css
const LIST_WIDTH = 400;
const SELECT_ZOOM = 15;
const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=';
const GEOCODER = 'https://nominatim.openstreetmap.org/search';
// keyless OpenStreetMap tiles, greyed out in locator.css; fine for v1 traffic,
// swap for a keyed provider (e.g. Google Maps) before high-traffic launch
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LEAFLET = '/deps/leaflet';

// per site language: units, address lookup country, the location used when the
// browser's is not available, and the sample data used when the API is unreachable
const REGIONS = {
  en: {
    unit: 'mi',
    country: 'us',
    locale: 'en-US',
    geoLang: 'en',
    origin: { lat: 44.9508008, lon: -92.9960732 },
    sample: '/data/dealers-us.json',
  },
  de: {
    unit: 'km',
    country: 'ch',
    locale: 'de-CH',
    geoLang: 'de',
    origin: { lat: 47.3769, lon: 8.5417 },
    sample: '/data/dealers-ch.json',
  },
  jp: {
    unit: 'km',
    country: 'us',
    locale: 'ja-JP',
    geoLang: 'ja',
    origin: { lat: 44.9508008, lon: -92.9960732 },
    sample: '/data/dealers-us.json',
  },
};
REGIONS.ja = REGIONS.jp;

const STRINGS = {
  en: {
    title: 'Find an installer',
    location: 'ZIP, City or address',
    search: 'Search',
    nearMe: 'Show results based on my location',
    myLocation: 'My location',
    name: 'Company name',
    radius: 'Radius',
    products: 'Product type',
    clear: 'Clear filters',
    mapView: 'Map view',
    listView: 'List view',
    showMore: 'Show more',
    directions: 'Get Directions',
    quote: 'Get a quote',
    results: (n) => (n === 1 ? '1 installer found' : `${n} installers found`),
    shown: (n) => `${n} results returned.`,
    loading: 'Loading installers …',
    locating: 'Getting location …',
    locationDenied: 'Please enable location in your browser or device.',
    locationUnknown: 'Location unknown. Please enter a location or enable location in your browser or device.',
    defaultLocation: 'Your location is not available, so we are showing installers near a default location. Enter a ZIP or city to search.',
    notFound: 'We could not find that location. Please check the ZIP or city.',
    empty: 'We are sorry, we haven\'t found any installer matching your search. Please search for another location, increase the radius or change the filters.',
    error: 'The service is currently not available. Please try again later.',
    sample: 'The installer service can\'t be reached from this site yet, so sample data is shown.',
    close: 'Close',
    map: 'Map of installers',
  },
  de: {
    title: 'Fachbetrieb finden',
    location: 'PLZ, Ort oder Adresse',
    search: 'Suchen',
    nearMe: 'Ergebnisse in meiner Nähe anzeigen',
    myLocation: 'Mein Standort',
    name: 'Firmenname',
    radius: 'Umkreis',
    products: 'Produkttyp',
    clear: 'Filter zurücksetzen',
    mapView: 'Kartenansicht',
    listView: 'Listenansicht',
    showMore: 'Mehr anzeigen',
    directions: 'Route berechnen',
    quote: 'Angebot anfordern',
    results: (n) => (n === 1 ? '1 Fachbetrieb gefunden' : `${n} Fachbetriebe gefunden`),
    shown: (n) => `${n} Ergebnisse angezeigt.`,
    loading: 'Fachbetriebe werden geladen …',
    locating: 'Standort wird ermittelt …',
    locationDenied: 'Bitte aktivieren Sie die Standortfreigabe in Ihrem Browser oder Gerät.',
    locationUnknown: 'Standort unbekannt. Bitte geben Sie einen Ort ein oder aktivieren Sie die Standortfreigabe.',
    defaultLocation: 'Ihr Standort ist nicht verfügbar. Wir zeigen Fachbetriebe in der Nähe eines Standardorts. Geben Sie PLZ oder Ort ein, um zu suchen.',
    notFound: 'Wir konnten diesen Ort nicht finden. Bitte prüfen Sie PLZ oder Ort.',
    empty: 'Leider haben wir keinen passenden Fachbetrieb gefunden. Bitte suchen Sie nach einem anderen Ort, vergrössern Sie den Umkreis oder ändern Sie die Filter.',
    error: 'Der Dienst ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
    sample: 'Der Fachbetriebe-Service ist von dieser Website noch nicht erreichbar. Es werden Beispieldaten angezeigt.',
    close: 'Schliessen',
    map: 'Karte der Fachbetriebe',
  },
  jp: {
    title: '施工店を探す',
    location: '郵便番号、都市名、住所',
    search: '検索',
    nearMe: '現在地周辺の結果を表示',
    myLocation: '現在地',
    name: '会社名',
    radius: '半径',
    products: '製品タイプ',
    clear: 'フィルターをクリア',
    mapView: '地図表示',
    listView: 'リスト表示',
    showMore: 'さらに表示',
    directions: '経路を表示',
    quote: '見積もりを依頼',
    results: (n) => `${n}件の施工店が見つかりました`,
    shown: (n) => `${n}件を表示しています。`,
    loading: '施工店を読み込み中…',
    locating: '現在地を取得中…',
    locationDenied: 'ブラウザまたはデバイスで位置情報を有効にしてください。',
    locationUnknown: '現在地を特定できません。場所を入力するか、位置情報を有効にしてください。',
    defaultLocation: '現在地を取得できないため、既定の場所周辺の施工店を表示しています。郵便番号または都市名を入力して検索してください。',
    notFound: 'その場所が見つかりませんでした。郵便番号または都市名をご確認ください。',
    empty: '条件に合う施工店が見つかりませんでした。別の場所を検索するか、半径を広げるか、フィルターを変更してください。',
    error: '現在サービスをご利用いただけません。しばらくしてから再度お試しください。',
    sample: '施工店サービスにまだ接続できないため、サンプルデータを表示しています。',
    close: '閉じる',
    map: '施工店の地図',
  },
};
STRINGS.ja = STRINGS.jp;

const ICONS = {
  pin: '<svg viewBox="0 0 22 27" aria-hidden="true" focusable="false"><path d="M11 0C4.9 0 0 4.9 0 11c0 8.2 11 16 11 16s11-7.8 11-16C22 4.9 17.1 0 11 0z"/><circle cx="11" cy="11" r="4.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>',
  locate: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21 3 3 10.5v1l7 2.5 2.5 7h1z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  route: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M21.7 11.3 12.7 2.3a1 1 0 0 0-1.4 0l-9 9a1 1 0 0 0 0 1.4l9 9a1 1 0 0 0 1.4 0l9-9a1 1 0 0 0 0-1.4zM14 14.5V12h-4v3H8v-4a1 1 0 0 1 1-1h5V7.5l3.5 3.5z"/></svg>',
};

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
}

function text(tag, cls, value) {
  const n = el(tag, cls);
  n.textContent = value;
  return n;
}

function pageLang() {
  const seg = (window.location.pathname.split('/').filter(Boolean)[0] || '').toLowerCase();
  return REGIONS[seg] ? seg : 'en';
}

// sample data stands in for an unreachable API everywhere except the live site
function allowSample() {
  return !window.location.hostname.endsWith('.aem.live');
}

function num(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

async function geocode(query, { country, geoLang }) {
  const params = new URLSearchParams({
    q: query, format: 'jsonv2', limit: '1', 'accept-language': geoLang,
  });
  if (country) params.set('countrycodes', country);
  const res = await fetch(`${GEOCODER}?${params}`);
  if (!res.ok) throw new Error(`${res.status} geocoder`);
  const [hit] = await res.json();
  return hit ? { lat: Number(hit.lat), lon: Number(hit.lon) } : null;
}

// browser location; gives up after `wait` ms so an ignored prompt doesn't block the page
function locate(wait = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('unavailable'));
      return;
    }
    const timer = setTimeout(() => reject(new Error('timeout')), wait);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        clearTimeout(timer);
        resolve({ lat: coords.latitude, lon: coords.longitude });
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { timeout: wait, maximumAge: 600000 },
    );
  });
}

function addressLines(d) {
  const street = [d.address, d.address2].filter(Boolean).join(', ');
  const isUS = /^(us|usa|united states)/i.test(d.country);
  const place = isUS
    ? [d.city, [d.state, d.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
    : [d.zip, d.city].filter(Boolean).join(' ');
  return [street, place].filter(Boolean);
}

async function loadLeaflet() {
  await Promise.all([
    loadCSS(`${LEAFLET}/leaflet.css`),
    loadCSS(`${LEAFLET}/MarkerCluster.css`),
    loadScript(`${LEAFLET}/leaflet.min.js`),
  ]);
  await loadScript(`${LEAFLET}/leaflet.markercluster.min.js`);
  return window.L;
}

/**
 * Map adapter: everything Leaflet-specific lives here, so the provider can be
 * swapped (e.g. for Google Maps) without touching the list and filters.
 */
function createMap(L, container, { onSelect }) {
  const map = L.map(container, {
    zoomControl: false,
    scrollWheelZoom: false,
  }).setView([46.8, 8.2], 4);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
  // only zoom with the wheel once the visitor has engaged with the map
  map.on('focus click', () => map.scrollWheelZoom.enable());
  map.on('blur mouseout', () => map.scrollWheelZoom.disable());

  const accent = getComputedStyle(container).getPropertyValue('--accent').trim() || '#d10411';
  const pinIcon = (active) => L.divIcon({
    html: ICONS.pin,
    className: `locator-pin${active ? ' is-active' : ''}`,
    iconSize: active ? [42, 52] : [22, 27],
    iconAnchor: active ? [21, 52] : [11, 27],
  });
  const clusters = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 40,
    disableClusteringAtZoom: SELECT_ZOOM - 1,
    iconCreateFunction: (c) => L.divIcon({
      html: `<span>${c.getChildCount()}</span>`,
      className: 'locator-cluster',
      iconSize: [40, 40],
    }),
  }).addTo(map);
  const markers = new Map();
  let originMarker = null;
  let radiusCircle = null;
  let activeId = null;

  // the list covers the left of the map, so keep pins clear of it
  const leftPad = () => (container.closest('.is-list-view') ? 0 : LIST_WIDTH);
  const padding = () => ({
    paddingTopLeft: [leftPad() + 32, 48],
    paddingBottomRight: [64, 48],
  });

  function centerOn(latlng, zoom) {
    const point = map.project(latlng, zoom).subtract([leftPad() / 2, 0]);
    map.setView(map.unproject(point, zoom), zoom);
  }

  let lastFit = null;
  const api = {
    setDealers(dealers) {
      clusters.clearLayers();
      markers.clear();
      activeId = null;
      dealers.filter((d) => d.lat !== null).forEach((d) => {
        const marker = L.marker([d.lat, d.lon], {
          icon: pinIcon(false), title: d.name, alt: d.name, riseOnHover: true,
        });
        marker.on('click', () => onSelect(d.id, 'map'));
        markers.set(d.id, marker);
      });
      clusters.addLayers([...markers.values()]);
    },
    setOrigin(origin, radiusMiles) {
      if (originMarker) originMarker.remove();
      if (radiusCircle) radiusCircle.remove();
      originMarker = null;
      radiusCircle = null;
      if (!origin) return;
      radiusCircle = L.circle([origin.lat, origin.lon], {
        radius: radiusMiles * KM_PER_MILE * 1000,
        color: accent,
        weight: 1,
        opacity: 0.5,
        fillColor: accent,
        fillOpacity: 0.04,
        interactive: false,
      }).addTo(map);
      originMarker = L.circleMarker([origin.lat, origin.lon], {
        radius: 7, color: '#fff', weight: 3, fillColor: '#202024', fillOpacity: 1, interactive: false,
      }).addTo(map);
    },
    select(id) {
      const prev = markers.get(activeId);
      if (prev) prev.setIcon(pinIcon(false)).setZIndexOffset(0);
      activeId = id;
      const marker = markers.get(id);
      if (!marker) return;
      marker.setIcon(pinIcon(true)).setZIndexOffset(1000);
      centerOn(marker.getLatLng(), Math.max(map.getZoom(), SELECT_ZOOM));
    },
    fit(dealers, origin) {
      lastFit = [dealers, origin];
      const points = dealers.filter((d) => d.lat !== null).map((d) => [d.lat, d.lon]);
      if (origin) points.push([origin.lat, origin.lon]);
      if (points.length < 2) {
        // nothing (or only the search location) to show: frame the search radius
        if (radiusCircle) map.fitBounds(radiusCircle.getBounds(), padding());
        else if (points.length) centerOn(L.latLng(points[0]), 13);
        return;
      }
      map.fitBounds(L.latLngBounds(points), { ...padding(), maxZoom: 14 });
    },
    resize() {
      map.invalidateSize();
    },
  };

  // the block can be built while its section is still hidden: once the map
  // gets a size, redraw it and repeat the last fit
  let wasHidden = !container.clientWidth;
  new ResizeObserver(() => {
    if (!container.clientWidth) {
      wasHidden = true;
      return;
    }
    map.invalidateSize();
    if (wasHidden && lastFit) api.fit(...lastFit);
    wasHidden = false;
  }).observe(container);

  return api;
}

function createCard(d, { t, region, onSelect }) {
  const card = el('li', 'locator-card');
  card.dataset.id = d.id;

  const aside = el('div', 'locator-card-aside', `<span class="locator-card-pin">${ICONS.pin}</span>`);
  if (d.distanceInMiles !== null) {
    const value = region.unit === 'km' ? d.distanceInMiles * KM_PER_MILE : d.distanceInMiles;
    const fmt = new Intl.NumberFormat(region.locale, { maximumFractionDigits: 1 });
    aside.append(text('span', 'locator-card-dist', `${fmt.format(value)} ${region.unit}`));
  }

  const main = el('div', 'locator-card-main');
  const heading = el('h3', 'locator-card-name');
  const select = text('button', 'locator-card-select', d.name);
  select.type = 'button';
  heading.append(select);
  main.append(heading);

  const addr = el('p', 'locator-card-addr');
  addressLines(d).forEach((line, i) => {
    if (i) addr.append(el('br'));
    addr.append(line);
  });
  main.append(addr);

  if (d.phone) {
    const phone = el('a', 'locator-card-phone', ICONS.phone);
    phone.href = `tel:${d.phone.replace(/[^0-9+]/g, '')}`;
    phone.append(text('span', '', d.phone));
    main.append(phone);
  }

  if (d.products.length) {
    const products = el('ul', 'locator-card-products');
    d.products.forEach((p) => products.append(text('li', '', p)));
    main.append(products);
  }

  const actions = el('div', 'locator-card-actions');
  if (d.lat !== null) {
    const dir = el('a', 'locator-card-directions', ICONS.route);
    dir.href = `${DIRECTIONS}${d.lat},${d.lon}`;
    dir.target = '_blank';
    dir.rel = 'noopener noreferrer';
    dir.append(text('span', '', t.directions));
    actions.append(dir);
  }
  const quote = text('button', 'locator-card-quote', t.quote);
  quote.type = 'button';
  actions.append(quote);
  main.append(actions);

  card.append(aside, main);
  card.addEventListener('click', (e) => {
    if (!e.target.closest('a, .locator-card-quote')) onSelect(d.id, 'list');
  });
  return { card, quote };
}

// open a modal with the Marketo "get a quote" form for the chosen installer
async function openQuote(d, { t, quote }) {
  await loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/marketo/marketo.css`);
  const overlay = el('div', 'rs-quote-overlay');
  const dialog = el('div', 'rs-quote-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  const closeBtn = el('button', 'rs-quote-close', '✕');
  closeBtn.type = 'button';
  closeBtn.setAttribute('aria-label', t.close);
  const heading = text('h3', 'rs-quote-title', d ? `${t.quote} — ${d.name}` : t.quote);
  const mkto = el('div', 'marketo');
  mkto.textContent = quote || DEFAULT_QUOTE;
  dialog.append(closeBtn, heading, mkto);
  overlay.append(dialog);
  document.body.append(overlay);
  document.body.classList.add('rs-quote-lock');
  closeBtn.focus();

  function shut() {
    overlay.remove();
    document.body.classList.remove('rs-quote-lock');
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') shut(); }
  closeBtn.onclick = shut;
  overlay.onclick = (e) => { if (e.target === overlay) shut(); };
  document.addEventListener('keydown', onKey);

  try {
    const { default: decorateMarketo } = await import('../marketo/marketo.js');
    await decorateMarketo(mkto);
  } catch (e) {
    mkto.textContent = t.error;
  }
}

/**
 * Build the locator UI into `root`. Shared by the block and the modal.
 * @param {Element} root container to render into
 * @param {object} opts block config: { api, region, radius, lat, lon, sample,
 *   title, quote, unit, country, onClose }
 */
async function buildLocator(root, opts) {
  const lang = pageLang();
  const t = STRINGS[lang] || STRINGS.en;
  const base = REGIONS[lang];
  const region = {
    ...base,
    ...(opts.unit ? { unit: opts.unit.trim().toLowerCase() === 'km' ? 'km' : 'mi' } : {}),
    ...(opts.country ? { country: opts.country.trim().toLowerCase() } : {}),
  };
  const fallbackOrigin = num(opts.lat) !== null && num(opts.lon) !== null
    ? { lat: num(opts.lat), lon: num(opts.lon) }
    : base.origin;
  const sample = opts.sample || region.sample;
  const api = createDealerApi(opts.api);
  const uid = `locator-${Math.random().toString(36).slice(2, 8)}`;

  root.textContent = '';
  if (opts.onClose) {
    const close = el('button', 'locator-close', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', t.close);
    close.onclick = opts.onClose;
    root.append(close);
  }
  if (opts.title) root.append(text('h2', 'locator-title', opts.title));

  // ---- filter bar ----
  const filters = el('div', 'locator-filters');
  const form = el('form', 'locator-search');
  form.setAttribute('role', 'search');
  const where = el('input', 'locator-where');
  where.type = 'search';
  where.placeholder = t.location;
  where.setAttribute('aria-label', t.location);
  where.autocomplete = 'postal-code';
  const go = el('button', 'locator-go', ICONS.search);
  go.type = 'submit';
  go.setAttribute('aria-label', t.search);
  go.title = t.search;
  const nearMe = el('button', 'locator-near', ICONS.locate);
  nearMe.type = 'button';
  nearMe.setAttribute('aria-label', t.nearMe);
  nearMe.title = t.nearMe;
  form.append(where, nearMe, go);

  const name = el('input', 'locator-name');
  name.type = 'search';
  name.placeholder = t.name;
  name.setAttribute('aria-label', t.name);

  // radius slider, in the page's unit
  const radiusWrap = el('div', 'locator-radius');
  const radiusLabel = text('label', 'locator-radius-label', t.radius);
  const radius = el('input', 'locator-radius-input');
  radius.type = 'range';
  radius.id = `${uid}-radius`;
  radiusLabel.htmlFor = radius.id;
  radius.min = RADIUS.min;
  radius.max = RADIUS.max;
  radius.step = RADIUS.step;
  const startRadius = num(opts.radius);
  radius.value = startRadius !== null
    ? Math.min(RADIUS.max, Math.max(RADIUS.min, startRadius))
    : RADIUS.value;
  const radiusOut = el('output', 'locator-radius-value');
  radiusOut.htmlFor = radius.id;
  radiusWrap.append(radiusLabel, radius, radiusOut);

  const count = el('p', 'locator-count');
  const status = el('p', 'locator-status');
  status.setAttribute('role', 'status');
  const note = el('p', 'locator-note');
  const row = el('div', 'locator-filter-row');
  row.append(form, name, radiusWrap, count);

  const chipRow = el('div', 'locator-chip-row');
  const chips = el('div', 'locator-chips');
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', t.products);
  const clear = text('button', 'locator-clear', t.clear);
  clear.type = 'button';
  chipRow.append(text('span', 'locator-chips-label', t.products), chips, clear);
  chipRow.hidden = true;
  filters.append(row, chipRow, status, note);

  // ---- tabs + results ----
  const tabs = el('div', 'locator-tabs');
  tabs.setAttribute('role', 'tablist');
  const results = el('div', 'locator-results');
  results.id = `${uid}-results`;
  const views = ['map', 'list'].map((view) => {
    const tab = text('button', 'locator-tab', view === 'map' ? t.mapView : t.listView);
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', results.id);
    tab.dataset.view = view;
    tabs.append(tab);
    return tab;
  });
  results.setAttribute('role', 'tabpanel');

  const mapEl = el('div', 'locator-map');
  mapEl.setAttribute('aria-label', t.map);
  const listWrap = el('div', 'locator-list-wrap');
  const list = el('ul', 'locator-list');
  const more = text('button', 'locator-more', t.showMore);
  more.type = 'button';
  more.hidden = true;
  const live = el('p', 'locator-live');
  live.setAttribute('aria-live', 'polite');
  listWrap.append(list, more, live);
  results.append(mapEl, listWrap);
  root.append(filters, tabs, results);

  const state = {
    dealers: [],
    total: null,
    hasMore: false,
    origin: null,
    take: PAGE_SIZE,
    name: '',
    products: new Set(),
    selectedId: null,
    view: 'map',
  };
  let mapApi = null;
  let shown = [];
  let seq = 0;
  let controller = null;

  const radiusMiles = () => (region.unit === 'km'
    ? Number(radius.value) / KM_PER_MILE
    : Number(radius.value));
  const showRadius = () => { radiusOut.textContent = `${radius.value} ${region.unit}`; };
  showRadius();

  function message(value) {
    list.textContent = '';
    list.append(text('li', 'locator-message', value));
  }

  function selectDealer(id, from) {
    state.selectedId = id;
    list.querySelectorAll('.locator-card').forEach((c) => {
      c.classList.toggle('is-active', c.dataset.id === id);
    });
    const card = list.querySelector(`.locator-card[data-id="${CSS.escape(id)}"]`);
    if (card && from === 'map') {
      // bring the chosen card to the top of the floating list
      listWrap.scrollTo({ top: card.offsetTop - list.offsetTop, behavior: 'smooth' });
    }
    if (mapApi && state.view === 'map') mapApi.select(id);
  }

  function matches(d) {
    const q = state.name.trim().toLowerCase();
    const hitName = !q || d.name.toLowerCase().includes(q);
    const hitProduct = !state.products.size || d.products.some((p) => state.products.has(p));
    return hitName && hitProduct;
  }

  // product chips come from the results loaded so far; selections are kept
  function buildChips() {
    const all = [...new Set([...state.dealers.flatMap((d) => d.products), ...state.products])]
      .sort((a, b) => a.localeCompare(b, region.locale));
    chips.textContent = '';
    all.forEach((p) => {
      const chip = text('button', 'locator-chip', p);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(state.products.has(p)));
      chip.onclick = () => {
        if (state.products.has(p)) state.products.delete(p);
        else state.products.add(p);
        chip.setAttribute('aria-pressed', String(state.products.has(p)));
        // eslint-disable-next-line no-use-before-define
        render();
      };
      chips.append(chip);
    });
    chipRow.hidden = !all.length;
  }

  function render({ fit = true } = {}) {
    const filtering = !!state.name.trim() || state.products.size > 0;
    shown = state.dealers.filter(matches)
      .sort((a, b) => (a.distanceInMiles ?? Infinity) - (b.distanceInMiles ?? Infinity));
    state.selectedId = null;

    count.textContent = t.results(filtering ? shown.length : (state.total ?? shown.length));
    live.textContent = t.shown(shown.length);
    more.hidden = !state.hasMore;
    clear.hidden = !filtering;

    list.textContent = '';
    if (!shown.length) message(t.empty);
    shown.forEach((d) => {
      const { card, quote: quoteBtn } = createCard(d, { t, region, onSelect: selectDealer });
      quoteBtn.onclick = () => openQuote(d, { t, quote: opts.quote });
      list.append(card);
    });

    if (mapApi) {
      mapApi.setDealers(shown);
      mapApi.setOrigin(state.origin, radiusMiles());
      if (fit && state.view === 'map') mapApi.fit(shown, state.origin);
    }
  }

  /**
   * Queries the dealer API for the current location and radius. "Show more"
   * asks for a larger `take`, so each response holds every result shown.
   */
  async function query({ take = PAGE_SIZE } = {}) {
    if (!state.origin) return;
    seq += 1;
    const current = seq;
    if (controller) controller.abort();
    controller = new AbortController();
    const search = {
      origin: state.origin,
      lat: state.origin.lat,
      lon: state.origin.lon,
      radius: Math.round(radiusMiles()),
      skip: 0,
      take,
      region: opts.region || '',
    };
    const before = list.querySelectorAll('.locator-card').length;
    if (take === PAGE_SIZE) message(t.loading);
    more.disabled = true;
    more.setAttribute('aria-busy', 'true');

    let res;
    try {
      res = await api.search(search, { signal: controller.signal });
      note.textContent = '';
    } catch (e) {
      if (e.name === 'AbortError') return;
      // eslint-disable-next-line no-console
      console.warn('locator: dealer API unavailable', e);
      if (allowSample()) {
        try {
          res = await searchSample(sample, search);
          note.textContent = t.sample;
        } catch (err) {
          res = null;
        }
      }
    } finally {
      if (current === seq) {
        more.disabled = false;
        more.removeAttribute('aria-busy');
      }
    }
    if (current !== seq) return;
    if (!res) {
      state.dealers = [];
      state.hasMore = false;
      message(t.error);
      more.hidden = true;
      count.textContent = '';
      if (mapApi) {
        mapApi.setDealers([]);
        mapApi.setOrigin(state.origin, radiusMiles());
      }
      return;
    }

    state.take = take;
    state.dealers = res.dealers;
    state.total = res.total;
    state.hasMore = res.hasMore;
    buildChips();
    render();
    if (take > PAGE_SIZE) {
      // move keyboard focus to the first newly loaded installer
      const next = list.querySelectorAll('.locator-card')[before];
      next?.querySelector('.locator-card-select')?.focus({ preventScroll: true });
    }
  }

  function searchFrom(origin) {
    state.origin = origin;
    return query();
  }

  async function useBrowserLocation({ initial = false } = {}) {
    status.textContent = t.locating;
    try {
      const origin = await locate();
      status.textContent = '';
      where.value = t.myLocation;
      await searchFrom(origin);
    } catch (err) {
      if (initial) {
        status.textContent = t.defaultLocation;
        await searchFrom(fallbackOrigin);
      } else {
        status.textContent = err.code === 1 ? t.locationDenied : t.locationUnknown;
      }
    }
  }

  function setView(view) {
    state.view = view;
    results.classList.toggle('is-list-view', view === 'list');
    views.forEach((tab) => {
      const on = tab.dataset.view === view;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    });
  }

  // ---- events ----
  views.forEach((tab) => {
    tab.addEventListener('click', () => {
      if (state.view === tab.dataset.view) return;
      setView(tab.dataset.view);
      render({ fit: false });
      if (mapApi && state.view === 'map') {
        mapApi.resize();
        mapApi.fit(shown, state.origin);
      }
    });
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const next = views[(views.indexOf(tab) + 1) % views.length];
      next.focus();
      next.click();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = where.value.trim();
    status.textContent = '';
    if (!value || value === t.myLocation) {
      await useBrowserLocation();
      return;
    }
    try {
      const origin = await geocode(value, region);
      if (!origin) {
        status.textContent = t.notFound;
        return;
      }
      await searchFrom(origin);
    } catch (err) {
      status.textContent = t.error;
    }
  });

  nearMe.addEventListener('click', () => useBrowserLocation());

  let radiusTimer;
  radius.addEventListener('input', () => {
    showRadius();
    clearTimeout(radiusTimer);
    radiusTimer = setTimeout(() => query(), 350);
  });

  name.addEventListener('input', () => {
    state.name = name.value;
    render();
  });

  clear.addEventListener('click', () => {
    state.name = '';
    name.value = '';
    state.products.clear();
    chips.querySelectorAll('.locator-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    render();
  });

  more.addEventListener('click', () => query({ take: state.take + PAGE_SIZE }));

  setView('map');
  message(t.loading);

  const L = await loadLeaflet().catch(() => null);
  if (L) mapApi = createMap(L, mapEl, { onSelect: selectDealer });
  else mapEl.append(text('p', 'locator-message', t.error));
  // don't hold up the rest of the page while the visitor answers the location prompt
  useBrowserLocation({ initial: true });
}

/**
 * Open the locator as a full-screen modal, created on demand.
 * Usable from any block (e.g. the visualizer's "Find an installer" CTA).
 */
export async function openLocatorModal({ api, title, quote } = {}) {
  await loadCSS(`${window.hlx?.codeBasePath || ''}/blocks/locator/locator.css`);
  const overlay = el('div', 'locator locator-modal');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.append(overlay);
  document.body.classList.add('rs-locator-lock');

  function close() {
    overlay.remove();
    document.body.classList.remove('rs-locator-lock');
    // eslint-disable-next-line no-use-before-define
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) {
    // leave Esc to the quote dialog while it is open
    if (e.key === 'Escape' && !document.querySelector('.rs-quote-overlay')) close();
  }
  document.addEventListener('keydown', onKey);

  const t = STRINGS[pageLang()] || STRINGS.en;
  await buildLocator(overlay, {
    api,
    title: title || t.title,
    quote,
    onClose: close,
  });
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  await buildLocator(block, {
    api: cfg.api,
    region: cfg.region,
    radius: cfg.radius,
    lat: cfg.lat,
    lon: cfg.lon,
    sample: cfg.sample,
    title: cfg.title,
    quote: cfg.quote,
    unit: cfg.unit,
    country: cfg.country,
  });
}
