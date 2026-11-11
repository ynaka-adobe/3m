/* eslint-env node, es2020 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  keepUntil,
  COUNTRY_CENTERS, isProShop, sortDealers, matchesFilters, splitList, telHref, whatsAppHref,
  websiteHref, websiteLabel, directionsHref, countryCode,
} from '../../blocks/locator/locator-utils.js';

const PRO = '3M™ Pro Shop Dealer';
const AUTH = 'Authorized Dealer';
const dealer = (id, distanceInMiles, partnerType = AUTH, products = []) => ({
  id, distanceInMiles, partnerType, products, lat: 1, lon: 2,
});

describe('locator sorting', () => {
  it('recognises Pro Shop dealers from partnerType', () => {
    assert.equal(isProShop({ partnerType: PRO }), true);
    assert.equal(isProShop({ partnerType: AUTH }), false);
    assert.equal(isProShop({}), false);
  });

  it('lists Pro Shops first, then everything by distance', () => {
    const sorted = sortDealers([
      dealer('a', 2), dealer('p2', 30, PRO), dealer('b', 1), dealer('p1', 10, PRO),
      dealer('c', null),
    ]);
    assert.deepEqual(sorted.map((d) => d.id), ['p1', 'p2', 'b', 'a', 'c']);
  });
});

describe('locator filters', () => {
  const window = ['3M™ Automotive Window Film'];
  const both = ['3M™ Automotive Window Film', '3M™ Paint Protection Film'];
  const filters = (products = [], partners = []) => ({
    products: new Set(products), partners: new Set(partners),
  });

  it('needs every selected product type (AND)', () => {
    const f = filters(both);
    assert.equal(matchesFilters(dealer('x', 1, AUTH, both), f), true);
    assert.equal(matchesFilters(dealer('y', 1, AUTH, window), f), false);
  });

  it('accepts any selected partner type (OR), combined with products (AND)', () => {
    const f = filters(window, [PRO, AUTH]);
    assert.equal(matchesFilters(dealer('x', 1, PRO, both), f), true);
    assert.equal(matchesFilters(dealer('y', 1, AUTH, window), f), true);
    assert.equal(matchesFilters(dealer('z', 1, PRO, []), f), false);
    assert.equal(matchesFilters(dealer('w', 1, AUTH, both), filters([], [PRO])), false);
  });

  it('shows everything without filters', () => {
    assert.equal(matchesFilters(dealer('x', 1), filters()), true);
  });

  it('splits comma-separated certification and product lists', () => {
    assert.deepEqual(
      splitList('3M™ Paint Protection Film Preferred Installer,3M™ Automotive Window Film with Crystalline Preferred Installer'),
      ['3M™ Paint Protection Film Preferred Installer', '3M™ Automotive Window Film with Crystalline Preferred Installer'],
    );
    assert.deepEqual(splitList(''), []);
    assert.deepEqual(splitList(null), []);
    assert.deepEqual(splitList(' a , ,b '), ['a', 'b']);
  });
});

describe('locator card links', () => {
  it('builds tel: links from the phone formats in the data', () => {
    assert.equal(telHref('(952) 473-8000'), 'tel:9524738000');
    assert.equal(telHref(' (999) 999 -9999'), 'tel:9999999999');
    assert.equal(telHref('612.555.0142'), 'tel:6125550142');
    assert.equal(telHref('+1 612 555 0142'), 'tel:+16125550142');
    assert.equal(telHref('612–555-0142'), 'tel:6125550142');
    assert.equal(telHref(''), null);
    assert.equal(telHref('n/a'), null);
  });

  it('builds WhatsApp links with a country code', () => {
    assert.equal(whatsAppHref('(612) 555-0142', 'us'), 'https://wa.me/16125550142');
    assert.equal(whatsAppHref('+1 612 555 0142', 'us'), 'https://wa.me/16125550142');
    assert.equal(whatsAppHref('1 612 555 0142', 'us'), 'https://wa.me/16125550142');
    assert.equal(whatsAppHref('0041 44 555 01 23', 'ch'), 'https://wa.me/41445550123');
    assert.equal(whatsAppHref('044 555 01 23', 'ch'), 'https://wa.me/41445550123');
    assert.equal(whatsAppHref(null, 'us'), null);
    assert.equal(whatsAppHref('', 'us'), null);
  });

  it('makes website links safe and complete', () => {
    assert.equal(websiteHref('http://www.g5tintshop.com/'), 'http://www.g5tintshop.com/');
    assert.equal(websiteHref('www.example.com'), 'https://www.example.com/');
    assert.equal(websiteHref('  https://impeccablewraps.com/ '), 'https://impeccablewraps.com/');
    assert.equal(websiteHref(' '), null);
    // a script link built from parts, so lint doesn't read it as code
    assert.equal(websiteHref(['javascript', 'alert(1)'].join(':')), null);
    assert.equal(websiteHref('mailto:a@b.com'), null);
    assert.equal(websiteHref('localhost'), null);
  });

  it('shows a short website label', () => {
    assert.equal(websiteLabel('https://www.instagram.com/pro_tint'), 'www.instagram.com/pro_tint');
    assert.equal(websiteLabel('http://robsglasstinting.com/'), 'robsglasstinting.com');
  });

  it('builds directions only with coordinates', () => {
    assert.equal(directionsHref({ lat: 44.9, lon: -93.1 }), 'https://www.google.com/maps/dir/?api=1&destination=44.9,-93.1');
    assert.equal(directionsHref({ lat: null, lon: null }), null);
  });
});

describe('locator fallback location', () => {
  it('has a centre for each site country', () => {
    assert.deepEqual(COUNTRY_CENTERS.us, { lat: 39.8283, lon: -98.5795 });
    assert.ok(COUNTRY_CENTERS.ch.lat > 45 && COUNTRY_CENTERS.ch.lat < 48);
  });

  it('reads the country code from the installer country', () => {
    assert.equal(countryCode('United States'), 'us');
    assert.equal(countryCode('Switzerland'), 'ch');
    assert.equal(countryCode(''), '');
  });
});

describe('locator loaded installers', () => {
  const res = (n) => ({
    dealers: Array.from({ length: n }, (_, i) => ({ id: String(i + 1), even: (i + 1) % 2 === 0 })),
    hasMore: false,
  });
  const even = (d) => d.even;
  const all = () => true;

  it('keeps `take` installers when no filter needs more', () => {
    const kept = keepUntil(res(40), { take: 19, want: 0, matches: even });
    assert.equal(kept.dealers.length, 19);
    assert.equal(kept.hasMore, true);
  });

  it('keeps loading until enough installers match', () => {
    // 10 even ids are reached at id 20
    const kept = keepUntil(res(40), { take: 10, want: 10, matches: even });
    assert.equal(kept.dealers.length, 20);
    assert.equal(kept.dealers.filter(even).length, 10);
  });

  it('keeps everything when the list runs out first', () => {
    const answer = res(7);
    assert.equal(keepUntil(answer, { take: 10, want: 10, matches: all }), answer);
  });
});
