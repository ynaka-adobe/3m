/**
 * Pure helpers for the locator block: sorting, filtering and the links on each
 * installer card. Kept free of DOM and map code so they can be unit tested.
 */

// map centres used when the visitor's location isn't available
export const COUNTRY_CENTERS = {
  us: { lat: 39.8283, lon: -98.5795 },
  ch: { lat: 46.8182, lon: 8.2275 },
};

// WhatsApp needs an international number; national numbers get this prefix
const CALLING_CODES = { us: '1', ch: '41' };

const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=';

/** Pro Shop dealers, from the `partnerType` value, e.g. "3M™ Pro Shop Dealer". */
export function isProShop(d) {
  return /pro\s*shop/i.test(d?.partnerType || '');
}

/** Pro Shops first, then by distance from the search location. */
export function sortDealers(dealers) {
  const dist = (d) => d.distanceInMiles ?? Infinity;
  return [...dealers].sort((a, b) => (Number(isProShop(b)) - Number(isProShop(a)))
    || (dist(a) - dist(b)));
}

/**
 * Product types: the installer must offer every selected one (AND).
 * Partner types: the installer must be one of the selected ones (OR).
 * @param {object} d dealer
 * @param {{ products: Set<string>, partners: Set<string> }} filters
 */
export function matchesFilters(d, { products, partners }) {
  const hasProducts = [...products].every((p) => d.products.includes(p));
  const isPartner = !partners.size || partners.has(d.partnerType);
  return hasProducts && isPartner;
}

/** Splits a comma-separated field into trimmed, non-empty values. */
/**
 * Trims a search answer to the installers to keep loaded: at least `take`, and
 * on until `want` of them pass `matches`. Anything beyond is left for "Show more".
 */
export function keepUntil(res, { take, want, matches }) {
  let found = 0;
  for (let i = 0; i < res.dealers.length; i += 1) {
    if (matches(res.dealers[i])) found += 1;
    if (i + 1 >= take && found >= want) {
      if (i + 1 === res.dealers.length) return res;
      return { ...res, dealers: res.dealers.slice(0, i + 1), hasMore: true };
    }
  }
  return res;
}

export function splitList(value) {
  return String(value ?? '').split(',').map((v) => v.trim()).filter(Boolean);
}

/** `tel:` link for a phone number in any of the formats in the data. */
export function telHref(phone) {
  const digits = String(phone ?? '').replace(/[^\d+]/g, '');
  return digits.replace(/\D/g, '').length >= 7 ? `tel:${digits}` : null;
}

/**
 * "Chat on WhatsApp" link. Numbers without a country code get the one for
 * the installer's country (10-digit US numbers get +1).
 */
export function whatsAppHref(number, country = 'us') {
  const raw = String(number ?? '').trim();
  let digits = raw.replace(/\D/g, '');
  if (raw.startsWith('00')) {
    digits = digits.slice(2);
  } else if (!raw.startsWith('+')) {
    const code = CALLING_CODES[country];
    if (code === '1') {
      if (digits.length === 10) digits = `1${digits}`;
    } else if (code && !digits.startsWith(code)) {
      digits = `${code}${digits.replace(/^0/, '')}`;
    }
  }
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

/** Country code ("us", "ch") from the installer's `country` name. */
export function countryCode(name) {
  const value = String(name ?? '').trim().toLowerCase();
  if (/^(us|usa|united states)/.test(value)) return 'us';
  if (/^(ch|switzerland|schweiz|suisse|svizzera)/.test(value)) return 'ch';
  return '';
}

/** Website link: trims, adds https:// when missing, only allows http(s). */
export function websiteHref(url) {
  const value = String(url ?? '').trim();
  if (!value) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value.replace(/^\/+/, '')}`;
  try {
    const parsed = new URL(withScheme);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) return null;
    return parsed.href;
  } catch (e) {
    return null;
  }
}

/** Short form of a website for display, e.g. "www.example.com". */
export function websiteLabel(href) {
  const { hostname, pathname } = new URL(href);
  const path = pathname.replace(/\/$/, '');
  return `${hostname}${path && path.length <= 24 ? path : ''}`;
}

/** Google Maps directions to the installer, or null without coordinates. */
export function directionsHref(d) {
  return d.lat !== null && d.lon !== null ? `${DIRECTIONS}${d.lat},${d.lon}` : null;
}
