/**
 * Dealer search API used by the locator block.
 *
 * Each provider describes how a search ({ lat, lon, radius, skip, take, region })
 * becomes a request. To use another backend, add a provider here and select it
 * with the block's `api` row, or set `api` to another endpoint URL that takes the
 * same query parameters. Records are mapped to the locator's dealer shape in
 * `normalize()`, so a backend with other field names only needs a new mapping.
 */
const PROVIDERS = {
  liveidb: {
    url: 'https://liveidb-api.azurewebsites.net/api/Company/FaiExPAL',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    params: ({
      lat, lon, radius, skip, take, region,
    }) => ({
      skip, take, region, radius, lat, lon,
    }),
  },
};

export const DEFAULT_PROVIDER = 'liveidb';

export function miles(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 3958.8 * Math.asin(Math.sqrt(h));
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
    products: String(d.productType || '').split(',').map((p) => p.trim()).filter(Boolean),
    lat: Number.isFinite(lat) && d.lat !== null ? lat : null,
    lon: Number.isFinite(lon) && d.lon !== null ? lon : null,
    distanceInMiles: d.distanceInMiles !== null && Number.isFinite(dist) ? dist : null,
  };
}

// accept a plain array or the usual list envelopes
function unwrap(json) {
  if (Array.isArray(json)) return { items: json, total: null };
  const items = ['data', 'items', 'results', 'companies', 'value']
    .map((k) => json?.[k]).find(Array.isArray) || [];
  const total = ['total', 'totalCount', 'count']
    .map((k) => json?.[k]).find(Number.isFinite);
  return { items, total: total ?? null };
}

function toResult(items, total, { origin, skip, take }) {
  const dealers = items
    .filter((d) => d && !d.deleted)
    .map(normalize)
    .map((d) => ({
      ...d,
      distanceInMiles: d.distanceInMiles ?? (d.lat !== null ? miles(origin, d) : null),
    }));
  return {
    dealers,
    total,
    hasMore: total !== null ? skip + items.length < total : items.length >= take,
  };
}

/**
 * @param {string} [api] provider name or endpoint URL (defaults to liveidb)
 * @returns {{ search: Function }} search(query, { signal }) resolves to
 *   { dealers, total, hasMore }
 */
export function createDealerApi(api) {
  const key = (api || DEFAULT_PROVIDER).trim();
  const provider = PROVIDERS[key.toLowerCase()]
    || { ...PROVIDERS[DEFAULT_PROVIDER], url: key };
  return {
    async search(query, { signal } = {}) {
      const params = new URLSearchParams();
      Object.entries(provider.params(query)).forEach(([k, v]) => params.set(k, v ?? ''));
      const res = await fetch(`${provider.url}?${params}`, {
        method: provider.method,
        headers: provider.headers,
        body: provider.body ? JSON.stringify(provider.body(query)) : undefined,
        signal,
      });
      if (!res.ok || res.redirected) throw new Error(`dealer api ${res.status}`);
      const { items, total } = unwrap(await res.json());
      return toResult(items, total, query);
    },
  };
}

const sampleCache = {};

/**
 * Searches a static JSON file in the backend format, for development and for
 * when the API is unreachable. Applies radius, sorting and paging in the browser.
 */
export async function searchSample(source, query) {
  if (!sampleCache[source]) {
    sampleCache[source] = fetch(source).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${source}`);
      return res.json();
    });
    sampleCache[source].catch(() => { delete sampleCache[source]; });
  }
  const { items } = unwrap(await sampleCache[source]);
  const { origin, radius } = query;
  const inRange = items
    .filter((d) => d && !d.deleted)
    .map((d) => ({
      ...d,
      distanceInMiles: miles(origin, { lat: Number(d.lat), lon: Number(d.lon) }),
    }))
    .filter((d) => d.distanceInMiles <= radius)
    .sort((a, b) => a.distanceInMiles - b.distanceInMiles);
  const page = inRange.slice(query.skip, query.skip + query.take);
  return toResult(page, inRange.length, { ...query, skip: query.skip });
}
