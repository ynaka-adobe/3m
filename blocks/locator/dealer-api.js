/**
 * Dealer search API used by the locator block.
 *
 * The locator proxy (a Cloudflare Worker) looks dealers up for a search
 * ({ lat, lon, radius, skip, take, region }): it gets a session token and calls
 * the dealer backend server-side, so the browser never talks to the backend or
 * handles credentials. It is a plain GET without custom headers, so browsers
 * send no CORS preflight. Its CORS settings allow localhost:3000, *.aem.page and
 * *.aem.live; other origins need a change in the Worker's configuration.
 *
 * To use another backend with the same contract, set the block's `api` row to
 * its endpoint URL.
 * Records are mapped to the locator's dealer shape in `normalize()`.
 */
import { splitList } from './locator-utils.js';

export const PROXY_URL = 'https://personal-auto-locator-proxy.parallel-pictures-apps.workers.dev/api/locator';
// the proxy accepts at most this many results per request
export const MAX_TAKE = 100;

export class DealerApiError extends Error {
  /**
   * @param {string} message
   * @param {object} [details] { status, stage, upstreamStatus, network, cause }
   */
  constructor(message, details = {}) {
    super(message);
    this.name = 'DealerApiError';
    Object.assign(this, details);
  }
}

export function miles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
}

const toInt = (value, fallback) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Validates and normalises a search to the proxy's parameter rules.
 * @throws {DealerApiError} when lat or lon is missing or out of range
 */
export function toParams({
  lat, lon, radius, skip, take, region,
}) {
  const la = Number(lat);
  const lo = Number(lon);
  if (lat === null || lat === undefined || !Number.isFinite(la) || la < -90 || la > 90
    || lon === null || lon === undefined || !Number.isFinite(lo) || lo < -180 || lo > 180) {
    throw new DealerApiError('A valid search location is required.', { stage: 'params' });
  }
  const code = String(region ?? '').trim();
  return new URLSearchParams({
    lat: String(la),
    lon: String(lo),
    radius: String(Math.max(0, toInt(radius, 50))),
    skip: String(Math.max(0, toInt(skip, 0))),
    take: String(Math.min(MAX_TAKE, Math.max(0, toInt(take, MAX_TAKE)))),
    region: /^[a-z0-9]+$/i.test(code) ? code.toUpperCase() : 'US',
  });
}

function normalize(d, i) {
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  const dist = Number(d.distanceInMiles);
  return {
    id: String(d.companyID || i),
    name: String(d.companyName || '').trim(),
    phone: String(d.phone || '').trim(),
    address: String(d.address || '').trim(),
    address2: String(d.address2 || '').trim(),
    city: String(d.city || '').trim(),
    state: String(d.stateProvince || '').trim(),
    zip: String(d.zip || '').trim(),
    country: String(d.country || '').trim(),
    products: splitList(d.productType),
    partnerType: String(d.partnerType || '').trim(),
    certifications: splitList(d.certificationType),
    website: String(d.website || '').trim(),
    whatsApp: String(d.whatsApp || '').trim(),
    // email is deliberately not mapped: it is never shown (Get a Quote instead)
    lat: d.lat !== null && d.lat !== '' && Number.isFinite(lat) ? lat : null,
    lon: d.lon !== null && d.lon !== '' && Number.isFinite(lon) ? lon : null,
    distanceInMiles: d.distanceInMiles !== null && Number.isFinite(dist) ? dist : null,
  };
}

// the filter values found in a list of dealers, for the filter chips
function facetsOf(dealers) {
  return {
    products: [...new Set(dealers.flatMap((d) => d.products))],
    partners: [...new Set(dealers.map((d) => d.partnerType).filter(Boolean))],
  };
}

// keeps the dealers that pass `filter`, in display `order`, as one page
function toPage(dealers, {
  start, wanted, filter, order,
}) {
  const matching = order(dealers.filter(filter));
  return {
    dealers: matching.slice(start, start + wanted),
    total: matching.length,
    hasMore: start + wanted < matching.length,
    facets: facetsOf(dealers),
  };
}

function toDealers(items, origin) {
  return items
    .filter((d) => d && !d.deleted)
    .map(normalize)
    .map((d) => ({
      ...d,
      distanceInMiles: d.distanceInMiles ?? (origin && d.lat !== null ? miles(origin, d) : null),
    }));
}

async function readError(res) {
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return new DealerApiError(body?.error || `The dealer search answered ${res.status}.`, {
    status: res.status,
    stage: body?.stage,
    upstreamStatus: body?.upstreamStatus,
  });
}

/**
 * Fetches one page (take <= MAX_TAKE) from the proxy.
 * @returns {Promise<{ items: object[], total: number|null }>}
 */
async function fetchPage(url, query, signal) {
  let res;
  try {
    // no custom headers: a simple GET, so the browser sends no preflight
    res = await fetch(`${url}?${toParams(query)}`, { credentials: 'omit', signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new DealerApiError('The dealer search could not be reached.', { network: true, cause: e });
  }
  if (!res.ok) throw await readError(res);
  let json;
  try {
    json = await res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new DealerApiError('The dealer search sent an unreadable answer.', { status: res.status });
  }
  if (!Array.isArray(json?.items)) {
    throw new DealerApiError('The dealer search answer has no items.', { status: res.status });
  }
  const total = Number(json.totalItemsCount);
  return { items: json.items, total: Number.isFinite(total) ? total : null };
}

// identifies a result list: the same search with any skip/take
function listKey(url, query) {
  const p = toParams(query);
  return [url, p.get('lat'), p.get('lon'), p.get('radius'), p.get('region')].join('|');
}

/**
 * Searches the proxy. A `take` above MAX_TAKE is fetched in consecutive pages
 * (skip, skip + 100, ...), stopping early once the results run out.
 *
 * The upstream currently ignores skip and take and always returns the whole
 * list (sorted by distance). When a page holds more items than requested, it is
 * kept as the complete list in `memo` and paged here, so "Show more" for the
 * same search needs no new request. If the upstream starts paging, the normal
 * path below takes over.
 * @param {string} url proxy endpoint
 * @param {object} query { origin, lat, lon, radius, skip, take, region }
 * @param {object} options { signal, filter, order }: an AbortSignal, a dealer
 *   filter, and a sort for display
 * @param {object} memo { key, items } complete list of the last such search
 * @returns {Promise<{ dealers: object[], total: number|null, hasMore: boolean,
 *   facets: { products: string[], partners: string[] } }>}
 */
async function searchProxy(url, query, { signal, filter, order }, memo) {
  const start = Math.max(0, toInt(query.skip, 0));
  const wanted = Math.max(0, toInt(query.take, MAX_TAKE));
  const key = listKey(url, query);
  // with the whole list at hand, filters and the display order apply before
  // paging: filters cover every result, and e.g. every Pro Shop in the radius
  // comes before the other installers
  const fromList = (list) => toPage(toDealers(list, query.origin), {
    start, wanted, filter, order,
  });
  if (memo.key === key) return fromList(memo.items);

  const items = [];
  let total = null;
  let lastPageFull = true;
  do {
    const take = Math.min(MAX_TAKE, wanted - items.length);
    // eslint-disable-next-line no-await-in-loop -- pages depend on the ones before
    const page = await fetchPage(url, { ...query, skip: start + items.length, take }, signal);
    if (page.items.length > take) {
      // paging was ignored: this is the whole list, from the first result
      memo.key = key;
      memo.items = page.items.filter((d) => d && !d.deleted);
      return fromList(memo.items);
    }
    items.push(...page.items);
    total = page.total ?? total;
    lastPageFull = page.items.length >= take && take > 0;
  } while (items.length < wanted && lastPageFull
    && (total === null || start + items.length < total));

  // trust the upstream total; without one, a full last page may mean more
  const hasMore = total !== null ? start + items.length < total : lastPageFull;
  if (start === 0 && !hasMore) {
    // everything fitted in what was asked for: that is the whole list too, so
    // filters, order and the count work on it like on any complete list
    memo.key = key;
    memo.items = items.filter((d) => d && !d.deleted);
    return fromList(memo.items);
  }

  // a paged upstream: filters and order can only apply to the results loaded
  const dealers = toDealers(items, query.origin);
  return {
    dealers: order(dealers.filter(filter)),
    total,
    hasMore,
    facets: facetsOf(dealers),
  };
}

/**
 * @param {string} [api] endpoint URL with the proxy's contract, or empty for the
 *   locator proxy
 * @param {object} [options] { order } a sort for display that is applied to
 *   complete result lists before paging
 * @returns {{ search: Function }} search(query, { signal, filter })
 *   resolves to { dealers, total, hasMore, facets } or rejects with a
 *   DealerApiError (or an AbortError when cancelled); `filter` keeps dealers
 */
export function createDealerApi(api, { order = (dealers) => dealers } = {}) {
  const url = String(api || '').trim() || PROXY_URL;
  const options = ({ signal, filter = () => true } = {}) => ({ signal, filter, order });
  const memo = {};
  return {
    search: (query, opts) => searchProxy(url, query, options(opts), memo),
  };
}
