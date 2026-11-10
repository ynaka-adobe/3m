import { readBlockConfig, loadCSS, getMetadata } from '../../scripts/aem.js';
import { createDealerApi } from './dealer-api.js';
import {
  loadGoogleMaps, createMap, createSuggester, geocodeAddress,
} from './google-map.js';

// default Marketo form design URL for the "Get a quote" modal (override per
// page with a `quote` config row on the block)
const DEFAULT_QUOTE = 'https://engage-ab.marketo.com/?munchkinId=860-YON-741#/ds/mktform/3';
const PAGE_SIZE = 10;
// search radius in miles: "Show more" doubles it once all results are shown
const RADIUS = { start: 50, max: 200 };
const KM_PER_MILE = 1.609344;
// width of the list floating over the map; keep in sync with locator.css
const LIST_WIDTH = 400;
const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=';

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
    empty: 'We are sorry, we haven\'t found any installer matching your search. Please search for another location or change the filters.',
    error: 'The service is currently not available. Please try again later.',
    sample: 'Sample data is shown, not real installers.',
    retry: 'Try again',
    close: 'Close',
    map: 'Map of installers',
    mapUnavailable: 'The map is not available right now.',
  },
  de: {
    title: 'Fachbetrieb finden',
    location: 'PLZ, Ort oder Adresse',
    search: 'Suchen',
    nearMe: 'Ergebnisse in meiner Nähe anzeigen',
    myLocation: 'Mein Standort',
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
    empty: 'Leider haben wir keinen passenden Fachbetrieb gefunden. Bitte suchen Sie nach einem anderen Ort oder ändern Sie die Filter.',
    error: 'Der Dienst ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.',
    sample: 'Es werden Beispieldaten angezeigt, keine echten Fachbetriebe.',
    retry: 'Erneut versuchen',
    close: 'Schliessen',
    map: 'Karte der Fachbetriebe',
    mapUnavailable: 'Die Karte ist derzeit nicht verfügbar.',
  },
  jp: {
    title: '施工店を探す',
    location: '郵便番号、都市名、住所',
    search: '検索',
    nearMe: '現在地周辺の結果を表示',
    myLocation: '現在地',
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
    empty: '条件に合う施工店が見つかりませんでした。別の場所を検索するか、フィルターを変更してください。',
    error: '現在サービスをご利用いただけません。しばらくしてから再度お試しください。',
    sample: 'サンプルデータを表示しています（実際の施工店ではありません）。',
    retry: '再試行',
    close: '閉じる',
    map: '施工店の地図',
    mapUnavailable: '現在、地図を表示できません。',
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

function num(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
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

/**
 * Turns the location input into a combobox with location suggestions. The
 * suggestion source is set once the map service has loaded.
 * @param {HTMLInputElement} input location field
 * @param {object} options { id, label, onPick(item) }
 */
function createSuggestions(input, { id, label, onPick }) {
  const box = el('ul', 'locator-suggestions');
  box.id = id;
  box.hidden = true;
  box.setAttribute('role', 'listbox');
  box.setAttribute('aria-label', label);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', id);

  let source = null;
  let items = [];
  let active = -1;
  let timer;
  let seq = 0;

  function close() {
    // drop pending and in-flight lookups so a late reply doesn't reopen the list
    clearTimeout(timer);
    seq += 1;
    box.hidden = true;
    box.textContent = '';
    items = [];
    active = -1;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function highlight(i) {
    active = i;
    [...box.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
    if (i >= 0) input.setAttribute('aria-activedescendant', box.children[i].id);
    else input.removeAttribute('aria-activedescendant');
  }

  function pick(i) {
    const item = items[i];
    if (!item) return;
    input.value = item.text;
    close();
    onPick(item);
  }

  function show(list) {
    close();
    items = list;
    list.forEach((item, i) => {
      const li = text('li', 'locator-suggestion', item.text);
      li.id = `${id}-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      // mousedown so the pick happens before the input loses focus
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        pick(i);
      });
      box.append(li);
    });
    box.hidden = !list.length;
    input.setAttribute('aria-expanded', String(!!list.length));
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (!source || q.length < 2) {
      close();
      return;
    }
    timer = setTimeout(async () => {
      seq += 1;
      const current = seq;
      try {
        const list = await source.suggest(q);
        if (current === seq && input.value.trim() === q) show(list);
      } catch (e) {
        close();
      }
    }, 250);
  });

  input.addEventListener('keydown', (e) => {
    if (box.hidden || !items.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlight((active + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlight(active <= 0 ? items.length - 1 : active - 1);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      close();
    }
  });
  input.addEventListener('blur', () => setTimeout(close, 150));

  return {
    element: box,
    close,
    setSource(value) { source = value; },
  };
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
 * @param {object} opts block config: { key, mapId, api, region, radius, lat, lon, sample,
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
  const api = createDealerApi(opts.api, { sample });
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
  where.autocomplete = 'off';
  const go = el('button', 'locator-go', ICONS.search);
  go.type = 'submit';
  go.setAttribute('aria-label', t.search);
  go.title = t.search;
  const nearMe = el('button', 'locator-near', ICONS.locate);
  nearMe.type = 'button';
  nearMe.setAttribute('aria-label', t.nearMe);
  nearMe.title = t.nearMe;
  const suggestions = createSuggestions(where, {
    id: `${uid}-suggestions`,
    label: t.location,
    // eslint-disable-next-line no-use-before-define
    onPick: (item) => pickSuggestion(item),
  });
  form.append(where, nearMe, go, suggestions.element);

  // starting radius in miles: a `radius` row, capped at RADIUS.max
  const startRadius = Math.min(RADIUS.max, Math.max(1, num(opts.radius) ?? RADIUS.start));

  const count = el('p', 'locator-count');
  const status = el('p', 'locator-status');
  status.setAttribute('role', 'status');
  const note = el('p', 'locator-note');
  // sample data only when an author picks it (api: sample), never as a silent fallback
  if (api.sample) note.textContent = t.sample;
  const row = el('div', 'locator-filter-row');
  row.append(form, count);

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
  const moreError = el('p', 'locator-more-error');
  moreError.setAttribute('role', 'alert');
  listWrap.append(list, more, moreError, live);
  results.append(mapEl, listWrap);
  root.append(filters, tabs, results);

  const state = {
    dealers: [],
    total: null,
    hasMore: false,
    origin: null,
    take: PAGE_SIZE,
    products: new Set(),
    selectedId: null,
    view: 'map',
    radius: startRadius,
  };
  let mapApi = null;
  let maps = null;
  let suggester = null;
  let shown = [];
  let seq = 0;
  let controller = null;

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

  // an installer must offer every selected product type (AND)
  function matches(d) {
    return [...state.products].every((p) => d.products.includes(p));
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

  // more within the radius, or a wider radius still to search
  const canShowMore = () => state.hasMore || state.radius < RADIUS.max;

  function render({ fit = true, area = false } = {}) {
    const filtering = state.products.size > 0;
    shown = state.dealers.filter(matches)
      .sort((a, b) => (a.distanceInMiles ?? Infinity) - (b.distanceInMiles ?? Infinity));
    state.selectedId = null;

    count.textContent = t.results(filtering ? shown.length : (state.total ?? shown.length));
    live.textContent = t.shown(shown.length);
    more.hidden = !canShowMore();
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
      mapApi.setOrigin(state.origin, state.radius);
      if (fit && state.view === 'map') mapApi.fit(shown, state.origin, { area });
    }
  }

  // full error state with one manual retry; there are no automatic retries
  function showError(retry) {
    message(t.error);
    const again = text('button', 'locator-retry', t.retry);
    again.type = 'button';
    again.addEventListener('click', retry);
    list.firstElementChild.append(again);
  }

  /**
   * Queries the dealer API for the current location and radius. "Show more"
   * asks for a larger `take`, so each response holds every result shown, or,
   * once all are shown, a doubled radius (`expand`); the radius only changes
   * when that search succeeds. A newer query aborts the one in flight, and
   * only the latest may render.
   */
  async function query({ take = PAGE_SIZE, radius = state.radius, expand = false } = {}) {
    if (!state.origin) return;
    seq += 1;
    const current = seq;
    if (controller) controller.abort();
    controller = new AbortController();
    const search = {
      origin: state.origin,
      lat: state.origin.lat,
      lon: state.origin.lon,
      radius: Math.round(radius),
      skip: 0,
      take,
      region: opts.region || region.country.toUpperCase(),
    };
    const loadingMore = take > PAGE_SIZE;
    const before = list.querySelectorAll('.locator-card').length;
    moreError.textContent = '';
    if (!loadingMore) {
      message(t.loading);
      count.textContent = '';
    }
    more.disabled = true;
    more.setAttribute('aria-busy', 'true');

    let res = null;
    let failed = null;
    try {
      res = await api.search(search, { signal: controller.signal });
    } catch (e) {
      if (e.name === 'AbortError') return;
      failed = e;
    } finally {
      if (current === seq) {
        more.disabled = false;
        more.removeAttribute('aria-busy');
      }
    }
    if (current !== seq) return;
    if (failed) {
      // eslint-disable-next-line no-console
      console.warn('locator: dealer search failed', failed.message, failed.stage || '', failed.upstreamStatus || '');
      if (loadingMore) {
        // keep the installers already shown; the button stays for another try
        moreError.textContent = t.error;
        return;
      }
      state.dealers = [];
      state.total = null;
      state.hasMore = false;
      more.hidden = true;
      showError(() => query({ take }));
      if (mapApi) {
        mapApi.setDealers([]);
        mapApi.setOrigin(state.origin, state.radius);
        if (state.view === 'map') mapApi.fit([], state.origin);
      }
      return;
    }

    state.take = take;
    state.radius = radius;
    state.dealers = res.dealers;
    state.total = res.total;
    state.hasMore = res.hasMore;
    buildChips();
    // a wider radius zooms the map out to the whole search area
    render({ area: expand });
    if (take > PAGE_SIZE) {
      // move keyboard focus to the first newly loaded installer
      const next = list.querySelectorAll('.locator-card')[before];
      next?.querySelector('.locator-card-select')?.focus({ preventScroll: true });
    }
  }

  function searchFrom(origin) {
    state.origin = origin;
    state.radius = startRadius;
    suggester?.setBias(origin);
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

  // typed search: the geocoder, or the top suggestion if the geocoder is refused
  async function lookup(value) {
    try {
      return await geocodeAddress(maps, value, region);
    } catch (err) {
      if (!suggester) throw err;
      // eslint-disable-next-line no-console
      console.warn('locator: geocoder unavailable, using place suggestions', err);
      const [first] = await suggester.suggest(value);
      return first ? suggester.resolve(first) : null;
    }
  }

  async function pickSuggestion(item) {
    status.textContent = '';
    try {
      await searchFrom(await suggester.resolve(item));
    } catch (err) {
      status.textContent = t.notFound;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    suggestions.close();
    const value = where.value.trim();
    status.textContent = '';
    if (!value || value === t.myLocation) {
      await useBrowserLocation();
      return;
    }
    if (!maps) {
      status.textContent = t.mapUnavailable;
      return;
    }
    try {
      const origin = await lookup(value);
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

  clear.addEventListener('click', () => {
    state.products.clear();
    chips.querySelectorAll('.locator-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    render();
  });

  more.addEventListener('click', () => {
    const take = state.dealers.length + PAGE_SIZE;
    if (state.hasMore) query({ take });
    else if (state.radius < RADIUS.max) {
      query({ take, radius: Math.min(RADIUS.max, state.radius * 2), expand: true });
    }
  });

  setView('map');
  message(t.loading);

  function mapUnavailable() {
    mapApi = null;
    mapEl.textContent = '';
    mapEl.append(text('p', 'locator-message', t.mapUnavailable));
  }

  if (opts.key) {
    try {
      maps = await loadGoogleMaps({
        key: opts.key, language: region.geoLang, region: region.country,
      });
      mapApi = await createMap(maps, mapEl, {
        onSelect: selectDealer,
        mapId: opts.mapId,
        listWidth: LIST_WIDTH,
        onAuthError: () => {
          // eslint-disable-next-line no-console
          console.warn('locator: Google Maps rejected the API key; check its restrictions and enabled APIs');
          mapUnavailable();
        },
      });
      suggester = await createSuggester(maps, {
        country: region.country, language: region.geoLang,
      }).catch(() => null);
      suggestions.setSource(suggester);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('locator: Google Maps failed to load', e);
      mapUnavailable();
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('locator: no Google Maps API key; add google-maps-key page metadata or a key row');
    mapUnavailable();
  }
  // don't hold up the rest of the page while the visitor answers the location prompt
  useBrowserLocation({ initial: true });
}

// the Google Maps key and optional map ID: a block row wins over page metadata
function mapsConfig(cfg = {}) {
  return {
    key: (cfg.key || cfg['google-maps-key'] || getMetadata('google-maps-key')).trim(),
    mapId: (cfg['map-id'] || getMetadata('google-maps-map-id')).trim(),
  };
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
    ...mapsConfig(),
    api,
    title: title || t.title,
    quote,
    onClose: close,
  });
}

export default async function decorate(block) {
  const cfg = readBlockConfig(block);
  await buildLocator(block, {
    ...mapsConfig(cfg),
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
