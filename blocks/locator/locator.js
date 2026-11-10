import { readBlockConfig, loadCSS, getMetadata } from '../../scripts/aem.js';
import { createDealerApi } from './dealer-api.js';
import {
  loadGoogleMaps, createMap, createSuggester, geocodeAddress,
} from './google-map.js';
import {
  COUNTRY_CENTERS, isProShop, sortDealers, matchesFilters, telHref, whatsAppHref,
  websiteHref, websiteLabel, directionsHref, countryCode,
} from './locator-utils.js';

// default Marketo form design URL for the "Get a quote" modal (override per
// page with a `quote` config row on the block)
const DEFAULT_QUOTE = 'https://engage-ab.marketo.com/?munchkinId=860-YON-741#/ds/mktform/3';
const PAGE_SIZE = 10;
// search radius in miles: "Show more" doubles it once all results are shown
const RADIUS = { start: 50, max: 200 };
const KM_PER_MILE = 1.609344;
// width of the list floating over the map on desktop; keep in sync with locator.css
const LIST_WIDTH = 400;
const DESKTOP = '(width >= 900px)';
// Pro Shop badge logo: the 3M logo until an official Pro Shop logo is set
// with a `proshop-logo` row on the block
const PRO_SHOP_LOGO = '/icons/3m-logo.svg';

// per site language: units, address lookup country, the map centre used when the
// browser's location is not available (centre of the country), and the sample data
// for `api: sample`
const REGIONS = {
  en: {
    unit: 'mi',
    country: 'us',
    locale: 'en-US',
    geoLang: 'en',
    origin: COUNTRY_CENTERS.us,
    sample: '/data/dealers-us.json',
  },
  de: {
    unit: 'km',
    country: 'ch',
    locale: 'de-CH',
    geoLang: 'de',
    origin: COUNTRY_CENTERS.ch,
    sample: '/data/dealers-ch.json',
  },
  jp: {
    unit: 'km',
    country: 'us',
    locale: 'ja-JP',
    geoLang: 'ja',
    origin: COUNTRY_CENTERS.us,
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
    partners: 'Partner type',
    proShop: 'Pro Shop',
    proShopLabel: '3M™ Pro Shop Dealer',
    certified: 'Certifications',
    showPhone: 'Show phone number',
    showWhatsApp: 'Show WhatsApp',
    whatsApp: 'Chat on WhatsApp',
    newWindow: '(opens in a new window)',
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
    startHint: 'Showing installers around the center of the country. Enter a ZIP or city, or use your location.',
    defaultLocation: 'Your location is not available, so we are showing installers around the center of the country. Enter a ZIP or city to search near you.',
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
    partners: 'Partnertyp',
    proShop: 'Pro Shop',
    proShopLabel: '3M™ Pro Shop Dealer',
    certified: 'Zertifizierungen',
    showPhone: 'Telefonnummer anzeigen',
    showWhatsApp: 'WhatsApp anzeigen',
    whatsApp: 'Auf WhatsApp chatten',
    newWindow: '(öffnet in einem neuen Fenster)',
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
    startHint: 'Fachbetriebe rund um die Landesmitte. Geben Sie PLZ oder Ort ein oder verwenden Sie Ihren Standort.',
    defaultLocation: 'Ihr Standort ist nicht verfügbar. Wir zeigen Fachbetriebe rund um die Landesmitte. Geben Sie PLZ oder Ort ein, um in Ihrer Nähe zu suchen.',
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
    partners: 'パートナータイプ',
    proShop: 'Pro Shop',
    proShopLabel: '3M™ Pro Shop Dealer',
    certified: '認定',
    showPhone: '電話番号を表示',
    showWhatsApp: 'WhatsAppを表示',
    whatsApp: 'WhatsAppでチャット',
    newWindow: '（新しいウィンドウで開きます）',
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
    startHint: '国の中心付近の施工店を表示しています。郵便番号または都市名を入力するか、現在地を使用してください。',
    defaultLocation: '現在地を取得できないため、国の中心付近の施工店を表示しています。お近くを検索するには郵便番号または都市名を入力してください。',
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
  globe: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4z"/></svg>',
  whatsApp: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.2-.2-.3-.4-.5z"/></svg>',
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

// one tracked locator action, e.g. "phone-reveal"; analytics loads only when used
function trackAction(action, d, position) {
  import('../../scripts/analytics.js').then(({ track }) => track(`locator:${action}`, {
    locator: {
      action,
      position,
      installer: { id: d.id, name: d.name, partnerType: d.partnerType },
    },
  })).catch(() => {});
}

// a link that opens outside the site, in a new window
function externalLink(cls, href, icon, label, t) {
  const a = el('a', cls, icon);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.append(text('span', '', label), text('span', 'locator-sr', ` ${t.newWindow}`));
  return a;
}

// resolves once the EDS delayed phase has started (scripts/delayed.js)
// (with a fallback timer, so a missed signal, e.g. from an older cached
// delayed.js, can't keep the map from loading)
function whenDelayed(fallbackMs = 4000) {
  return new Promise((resolve) => {
    if (window.hlx?.delayed) {
      resolve();
      return;
    }
    window.addEventListener('aem:delayed', () => resolve(), { once: true });
    setTimeout(resolve, fallbackMs);
  });
}

const pause = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// resolves on the visitor's first scroll, tap, click or key press; with
// `pointer`, moving the mouse counts too
function firstInteraction({ pointer = false } = {}) {
  const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'];
  if (pointer) events.push('pointermove');
  return new Promise((resolve) => {
    const run = () => {
      events.forEach((type) => window.removeEventListener(type, run, true));
      resolve();
    };
    events.forEach((type) => window.addEventListener(type, run, { capture: true, passive: true }));
  });
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

  function lookup() {
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
  }

  input.addEventListener('input', lookup);

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
    // text typed before the suggestion service was ready gets looked up now
    setSource(value) {
      source = value;
      if (source && document.activeElement === input) lookup();
    },
  };
}

/**
 * One installer card, numbered like its pin on the map.
 * @param {object} d dealer
 * @param {object} ctx { t, region, number, proShopLogo, onSelect }
 */
function createCard(d, {
  t, region, number, proShopLogo, onSelect,
}) {
  const card = el('li', 'locator-card');
  card.dataset.id = d.id;
  const pro = isProShop(d);
  if (pro) card.classList.add('is-pro-shop');
  const track = (action) => trackAction(action, d, number);

  const aside = el('div', 'locator-card-aside', `<span class="locator-card-pin">${ICONS.pin}<span class="locator-card-number">${number}</span></span>`);
  if (d.distanceInMiles !== null) {
    const value = region.unit === 'km' ? d.distanceInMiles * KM_PER_MILE : d.distanceInMiles;
    const fmt = new Intl.NumberFormat(region.locale, { maximumFractionDigits: 1 });
    aside.append(text('span', 'locator-card-dist', `${fmt.format(value)} ${region.unit}`));
  }

  const main = el('div', 'locator-card-main');
  if (pro) {
    const badge = el('p', 'locator-card-badge');
    const logo = el('img');
    logo.src = proShopLogo;
    logo.alt = '';
    logo.width = 34;
    logo.height = 18;
    badge.append(logo, text('span', '', t.proShop));
    badge.title = t.proShopLabel;
    main.append(badge);
  }
  const heading = el('h3', 'locator-card-name');
  const select = text('button', 'locator-card-select', d.name);
  select.type = 'button';
  heading.append(select);
  main.append(heading);

  if (d.certifications.length) {
    const certs = el('ul', 'locator-card-certs');
    certs.setAttribute('aria-label', t.certified);
    d.certifications.forEach((c) => certs.append(text('li', '', c)));
    main.append(certs);
  }

  // the address opens directions in Google Maps
  const lines = addressLines(d);
  const directions = directionsHref(d);
  const addr = el(directions ? 'a' : 'p', 'locator-card-addr');
  lines.forEach((line, i) => {
    if (i) addr.append(el('br'));
    addr.append(line);
  });
  if (directions) {
    addr.href = directions;
    addr.target = '_blank';
    addr.rel = 'noopener noreferrer';
    addr.append(text('span', 'locator-sr', ` ${t.newWindow}`));
    addr.addEventListener('click', () => track('directions'));
  }
  main.append(addr);

  if (d.products.length) {
    const products = el('ul', 'locator-card-products');
    products.setAttribute('aria-label', t.products);
    d.products.forEach((p) => products.append(text('li', '', p)));
    main.append(products);
  }

  // phone and WhatsApp stay behind a toggle, so their use can be tracked
  const tel = telHref(d.phone);
  const chat = whatsAppHref(d.whatsApp, countryCode(d.country) || region.country);
  if (tel || chat) {
    const contact = el('div', 'locator-card-contact');
    const toggle = text('button', 'locator-card-reveal', tel ? t.showPhone : t.showWhatsApp);
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    const details = el('div', 'locator-card-contact-details');
    details.hidden = true;
    if (tel) {
      const phone = el('a', 'locator-card-phone', ICONS.phone);
      phone.href = tel;
      phone.append(text('span', '', d.phone));
      phone.addEventListener('click', () => track('phone-call'));
      details.append(phone);
    }
    if (chat) {
      const wa = externalLink('locator-card-whatsapp', chat, ICONS.whatsApp, t.whatsApp, t);
      wa.addEventListener('click', () => track('whatsapp'));
      details.append(wa);
    }
    toggle.addEventListener('click', () => {
      details.hidden = false;
      toggle.hidden = true;
      toggle.setAttribute('aria-expanded', 'true');
      details.querySelector('a')?.focus();
      track('phone-reveal');
    });
    contact.append(toggle, details);
    main.append(contact);
  }

  const site = websiteHref(d.website);
  if (site) {
    const link = externalLink('locator-card-website', site, ICONS.globe, websiteLabel(site), t);
    link.addEventListener('click', () => track('website'));
    main.append(link);
  }

  const actions = el('div', 'locator-card-actions');
  if (directions) {
    const dir = externalLink('locator-card-directions', directions, ICONS.route, t.directions, t);
    dir.addEventListener('click', () => track('directions'));
    actions.append(dir);
  }
  const quote = text('button', 'locator-card-quote', t.quote);
  quote.type = 'button';
  quote.addEventListener('click', () => track('quote'));
  actions.append(quote);
  main.append(actions);

  card.append(aside, main);
  card.addEventListener('click', (e) => {
    if (e.target.closest('a, button:not(.locator-card-select)')) return;
    onSelect(d.id, e.target.closest('.locator-card-select') ? 'name' : 'list');
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
 *   title, quote, unit, country, proShopLogo, onClose }
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
  const proShopLogo = opts.proShopLogo || `${window.hlx?.codeBasePath || ''}${PRO_SHOP_LOGO}`;
  // Pro Shops first, then by distance, across the whole result list
  const api = createDealerApi(opts.api, { sample, order: sortDealers });
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

  // two filter groups, both built from the data: product types and partner types
  const chipGroup = (label) => {
    const groupRow = el('div', 'locator-chip-row');
    const groupChips = el('div', 'locator-chips');
    groupChips.setAttribute('role', 'group');
    groupChips.setAttribute('aria-label', label);
    // placeholder chips keep the row's height until the results arrive
    groupChips.innerHTML = '<span class="locator-chip is-placeholder" aria-hidden="true"></span>'.repeat(3);
    groupRow.append(text('span', 'locator-chips-label', label), groupChips);
    return { row: groupRow, chips: groupChips };
  };
  const productGroup = chipGroup(t.products);
  const partnerGroup = chipGroup(t.partners);
  const clear = text('button', 'locator-clear', t.clear);
  clear.type = 'button';
  clear.hidden = true;
  partnerGroup.row.append(clear);
  filters.append(row, productGroup.row, partnerGroup.row, status, note);

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
  mapEl.setAttribute('role', 'region');
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
    partners: new Set(),
    facets: { products: [], partners: [] },
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
    const desktop = window.matchMedia(DESKTOP).matches;
    if (card && from === 'map') {
      // desktop: bring the card to the top of the floating list;
      // phone and tablet: the list is below the map, so scroll the page to it
      if (desktop) listWrap.scrollTo({ top: card.offsetTop - list.offsetTop, behavior: 'smooth' });
      else card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    if (from === 'name' && !desktop && state.view === 'map') {
      // phone and tablet: tapping a name shows the installer on the map above
      mapEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    if (mapApi && state.view === 'map') mapApi.select(id);
  }

  // products: every selected type (AND); partner types: any selected (OR)
  const matches = (d) => matchesFilters(d, state);

  // chips come from the results loaded so far; selections are kept
  function fillChips({ chips }, values, selected) {
    const all = [...new Set([...values, ...selected])].filter(Boolean)
      .sort((a, b) => a.localeCompare(b, region.locale));
    chips.textContent = '';
    all.forEach((v) => {
      const chip = text('button', 'locator-chip', v);
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(selected.has(v)));
      chip.onclick = () => {
        if (selected.has(v)) selected.delete(v);
        else selected.add(v);
        chip.setAttribute('aria-pressed', String(selected.has(v)));
        // filters apply to the whole result list, so search it again (no new
        // request when the list is already loaded)
        // eslint-disable-next-line no-use-before-define
        query();
      };
      chips.append(chip);
    });
  }

  // chip values come from the whole result list, not just the installers shown
  function buildChips() {
    fillChips(productGroup, state.facets.products, state.products);
    fillChips(partnerGroup, state.facets.partners, state.partners);
  }

  // more within the radius, or a wider radius still to search
  const canShowMore = () => state.hasMore || state.radius < RADIUS.max;

  function render({ fit = true, area = false } = {}) {
    const filtering = state.products.size > 0 || state.partners.size > 0;
    // already filtered and in order (Pro Shops first, then by distance) by the
    // dealer API; the numbers follow this order
    shown = state.dealers;
    state.selectedId = null;

    count.textContent = t.results(state.total ?? shown.length);
    live.textContent = t.shown(shown.length);
    more.hidden = !canShowMore();
    clear.hidden = !filtering;

    list.textContent = '';
    if (!shown.length) message(t.empty);
    shown.forEach((d, i) => {
      const { card, quote: quoteBtn } = createCard(d, {
        t, region, number: i + 1, proShopLogo, onSelect: selectDealer,
      });
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
      res = await api.search(search, { signal: controller.signal, filter: matches });
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
    state.facets = res.facets || { products: [], partners: [] };
    buildChips();
    // a wider radius zooms the map out to the whole search area
    render({ area: expand });
    if (take > PAGE_SIZE) {
      // move keyboard focus to the first newly loaded installer
      const next = list.querySelectorAll('.locator-card')[before];
      next?.querySelector('.locator-card-select')?.focus({ preventScroll: true });
    }
  }

  function searchFrom(origin, { radius = startRadius } = {}) {
    state.origin = origin;
    state.radius = radius;
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
        // keep the results around the centre of the country
        status.textContent = t.defaultLocation;
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
    // a search before the delayed phase loads the map service straight away
    // eslint-disable-next-line no-use-before-define
    if (!maps && !(await ensureMaps())) {
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
    state.partners.clear();
    filters.querySelectorAll('.locator-chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
    query();
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

  // draws the current results on a map that has just loaded
  function syncMap() {
    if (!mapApi) return;
    mapApi.setDealers(shown);
    mapApi.setOrigin(state.origin, state.radius);
    if (state.view === 'map') mapApi.fit(shown, state.origin);
  }

  /**
   * Loads Google Maps once: in the EDS delayed phase, or straight away when the
   * visitor needs it earlier (a typed search). The list works without it.
   */
  let mapsLoading = null;
  function ensureMaps() {
    if (mapsLoading) return mapsLoading;
    if (!opts.key) {
      // eslint-disable-next-line no-console
      console.warn('locator: no Google Maps API key; add google-maps-key page metadata or a key row');
      mapUnavailable();
      mapsLoading = Promise.resolve(null);
      return mapsLoading;
    }
    mapsLoading = (async () => {
      try {
        maps = await loadGoogleMaps({
          key: opts.key, language: region.geoLang, region: region.country,
        });
        mapApi = await createMap(maps, mapEl, {
          onSelect: selectDealer,
          mapId: opts.mapId,
          // the list only floats over the map on desktop
          listWidth: () => (window.matchMedia(DESKTOP).matches ? LIST_WIDTH : 0),
          onAuthError: () => {
            // eslint-disable-next-line no-console
            console.warn('locator: Google Maps rejected the API key; check its restrictions and enabled APIs');
            mapUnavailable();
          },
        });
        mapEl.classList.add('is-loaded');
        syncMap();
        suggester = await createSuggester(maps, {
          country: region.country, language: region.geoLang,
        }).catch(() => null);
        suggester?.setBias(state.origin);
        suggestions.setSource(suggester);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('locator: Google Maps failed to load', e);
        mapUnavailable();
      }
      return maps;
    })();
    return mapsLoading;
  }

  // results start right away around the centre of the country
  status.textContent = t.startHint;
  searchFrom(fallbackOrigin, { radius: RADIUS.max });

  // the map waits for the delayed phase, then for the visitor's first
  // interaction (a mouse move counts) or a few more seconds, so it never weighs
  // on the first view of the page; the pop-up opens on a click and loads it at once
  if (opts.onClose) ensureMaps();
  else {
    whenDelayed()
      .then(() => Promise.race([firstInteraction({ pointer: true }), pause(5000)]))
      .then(ensureMaps);
  }
  // a visitor about to search needs the address service: load it right away
  where.addEventListener('focus', () => ensureMaps(), { once: true });

  // ask for the visitor's location on their first interaction, never on load
  firstInteraction().then(() => useBrowserLocation({ initial: true }));
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
    proShopLogo: cfg['proshop-logo'],
  });
}
