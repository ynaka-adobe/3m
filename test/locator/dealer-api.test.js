/* eslint-env node, es2020 */
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDealerApi, toParams, DealerApiError, PROXY_URL, MAX_TAKE,
} from '../../blocks/locator/dealer-api.js';

const ORIGIN = { lat: 44.9508008, lon: -92.99607320000001 };

// a record in the dealer backend's format, as shared by the API team
const record = (overrides = {}) => ({
  companyID: 'companies/36337-A-0',
  companyName: 'Dent Kraft',
  phone: '(952) 473-8000',
  address: '6493 City West Pkwy',
  address2: '',
  city: 'Eden Prairie',
  stateProvince: 'MN',
  zip: '55344',
  country: 'United States',
  productType: '3M™ Automotive Window Film,3M™ Paint Protection Film,3M™ Ceramic Coating',
  distanceInMiles: 21.1,
  lat: 44.884979248046875,
  lon: -93.417884826660156,
  deleted: false,
  email: 'sales@example.com',
  partnerType: 'Authorized Dealer',
  certificationType: '3M™ Paint Protection Film Preferred Installer',
  website: ' https://www.dentkraft.example ',
  whatsApp: null,
  ...overrides,
});

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
});

let calls;
// queue of answers for successive fetch calls: Response, Error, or a function
function mockFetch(...answers) {
  calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: new URL(url, 'http://localhost:3000'), init });
    const answer = answers.length > 1 ? answers.shift() : answers[0];
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? answer(url, init) : answer.clone();
  };
}

const search = (overrides = {}) => ({
  origin: ORIGIN, ...ORIGIN, radius: 50, skip: 0, take: 10, region: 'US', ...overrides,
});

describe('locator dealer API (proxy)', () => {
  beforeEach(() => mockFetch(json({
    items: [], skip: 0, take: 10, totalItemsCount: 0,
  })));

  it('sends a simple GET to the proxy: no headers, no credentials, with the signal', async () => {
    const { signal } = new AbortController();
    await createDealerApi().search(search(), { signal });
    assert.equal(calls.length, 1);
    const [{ url, init }] = calls;
    assert.equal(`${url.origin}${url.pathname}`, PROXY_URL);
    assert.equal(init.credentials, 'omit');
    assert.equal(init.signal, signal);
    assert.equal(init.method, undefined);
    assert.equal(init.headers, undefined);
    assert.equal(init.mode, undefined);
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      lat: '44.9508008', lon: '-92.99607320000001', radius: '50', skip: '0', take: '10', region: 'US',
    });
    assert.equal(url.searchParams.has('apiSessionToken'), false);
  });

  it('maps items to dealers and drops deleted ones', async () => {
    mockFetch(json({
      items: [record(), record({ companyID: 'companies/2', deleted: true })],
      skip: 0,
      take: 10,
      totalItemsCount: 2,
    }));
    const { dealers } = await createDealerApi().search(search());
    assert.equal(dealers.length, 1);
    assert.deepEqual(dealers[0], {
      id: 'companies/36337-A-0',
      name: 'Dent Kraft',
      phone: '(952) 473-8000',
      address: '6493 City West Pkwy',
      address2: '',
      city: 'Eden Prairie',
      state: 'MN',
      zip: '55344',
      country: 'United States',
      products: ['3M™ Automotive Window Film', '3M™ Paint Protection Film', '3M™ Ceramic Coating'],
      partnerType: 'Authorized Dealer',
      certifications: ['3M™ Paint Protection Film Preferred Installer'],
      website: 'https://www.dentkraft.example',
      whatsApp: '',
      lat: 44.884979248046875,
      lon: -93.417884826660156,
      distanceInMiles: 21.1,
    });
  });

  it('computes the distance when an item has none, and keeps items without coordinates', async () => {
    mockFetch(json({
      items: [record({ distanceInMiles: null }), record({ companyID: 'x', lat: null, lon: null })],
      skip: 0,
      take: 10,
      totalItemsCount: 2,
    }));
    const { dealers } = await createDealerApi().search(search());
    assert.ok(dealers[0].distanceInMiles > 20 && dealers[0].distanceInMiles < 23);
    assert.equal(dealers[1].lat, null);
    assert.equal(dealers[1].distanceInMiles, 21.1);
  });

  it('uses totalItemsCount for "show more", not items.length === take', async () => {
    mockFetch(json({
      items: [record(), record({ companyID: '2' })], skip: 0, take: 10, totalItemsCount: 30,
    }));
    const res = await createDealerApi().search(search({ take: 10 }));
    assert.equal(res.total, 30);
    assert.equal(res.hasMore, true);
    assert.equal(calls.length, 1, 'a short page with a larger total is not re-requested');

    mockFetch(json({
      items: Array.from({ length: 10 }, (_, i) => record({ companyID: `${i}` })),
      skip: 0,
      take: 10,
      totalItemsCount: 10,
    }));
    assert.equal((await createDealerApi().search(search({ take: 10 }))).hasMore, false);
  });

  it('fetches a take above the proxy limit in consecutive pages', async () => {
    const page = (skip, take) => json({
      items: Array.from({ length: take }, (_, i) => record({ companyID: `${skip + i}` })),
      skip,
      take,
      totalItemsCount: 250,
    });
    mockFetch((url) => {
      const p = new URL(url).searchParams;
      return page(Number(p.get('skip')), Number(p.get('take')));
    });
    const res = await createDealerApi().search(search({ take: 150 }));
    assert.deepEqual(
      calls.map(({ url }) => [url.searchParams.get('skip'), url.searchParams.get('take')]),
      [['0', '100'], ['100', '50']],
    );
    assert.equal(res.dealers.length, 150);
    assert.equal(res.dealers[149].id, '149');
    assert.equal(res.hasMore, true);
  });

  it('stops paging when the results run out', async () => {
    mockFetch(json({
      items: Array.from({ length: 40 }, (_, i) => record({ companyID: `${i}` })),
      skip: 0,
      take: 100,
      totalItemsCount: 40,
    }));
    const res = await createDealerApi().search(search({ take: 150 }));
    assert.equal(calls.length, 1);
    assert.equal(res.dealers.length, 40);
    assert.equal(res.hasMore, false);
  });

  it('pages through the whole list itself when the upstream ignores skip and take', async () => {
    // what the proxy does today: every request returns all results, skip/take echoed
    mockFetch((url) => {
      const p = new URL(url).searchParams;
      return json({
        items: Array.from({ length: 12 }, (_, i) => record({ companyID: `${i}`, distanceInMiles: i })),
        skip: Number(p.get('skip')),
        take: Number(p.get('take')),
        totalItemsCount: 12,
      });
    });
    const api = createDealerApi();
    const first = await api.search(search({ take: 10 }));
    assert.deepEqual(first.dealers.map((d) => d.id), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    assert.equal(first.total, 12);
    assert.equal(first.hasMore, true);

    const more = await api.search(search({ take: 20 }));
    assert.equal(calls.length, 1, '"Show more" for the same search reuses the list');
    assert.equal(more.dealers.length, 12);
    assert.equal(more.hasMore, false);

    await api.search(search({ take: 10, radius: 100 }));
    assert.equal(calls.length, 2, 'a different search asks the proxy again');
  });

  it('applies the display order to the whole list before paging', async () => {
    mockFetch(json({
      items: Array.from({ length: 12 }, (_, i) => record({
        companyID: `${i}`,
        distanceInMiles: i,
        partnerType: i >= 9 ? '3M™ Pro Shop Dealer' : 'Authorized Dealer',
      })),
      skip: 0,
      take: 10,
      totalItemsCount: 12,
    }));
    const proFirst = (list) => [...list].sort((a, b) => (Number(b.partnerType.includes('Pro'))
      - Number(a.partnerType.includes('Pro'))) || (a.distanceInMiles - b.distanceInMiles));
    const res = await createDealerApi('', { order: proFirst }).search(search({ take: 4 }));
    assert.deepEqual(res.dealers.map((d) => d.id), ['9', '10', '11', '0']);
    assert.equal(res.hasMore, true);
  });

  it('filters the whole list and reports its filter values', async () => {
    mockFetch(json({
      items: Array.from({ length: 12 }, (_, i) => record({
        companyID: `${i}`,
        distanceInMiles: i,
        partnerType: i < 10 ? '3M™ Pro Shop Dealer' : 'Authorized Dealer',
        productType: i === 11 ? '3M™ Ceramic Coating' : '3M™ Automotive Window Film',
      })),
      skip: 0,
      take: 10,
      totalItemsCount: 12,
    }));
    const api = createDealerApi();
    const authorized = await api.search(search({ take: 10 }), {
      filter: (d) => d.partnerType === 'Authorized Dealer',
    });
    assert.deepEqual(authorized.dealers.map((d) => d.id), ['10', '11']);
    assert.equal(authorized.total, 2);
    assert.equal(authorized.hasMore, false);
    assert.deepEqual(authorized.facets.partners.sort(), ['3M™ Pro Shop Dealer', 'Authorized Dealer']);
    assert.deepEqual(authorized.facets.products.sort(), ['3M™ Automotive Window Film', '3M™ Ceramic Coating']);
    assert.equal(calls.length, 1, 'changing the filter reuses the loaded list');
  });

  it('counts the filtered installers when everything fits in one answer', async () => {
    mockFetch(json({
      items: Array.from({ length: 7 }, (_, i) => record({
        companyID: `${i}`,
        partnerType: i < 2 ? '3M™ Pro Shop Dealer' : 'Authorized Dealer',
      })),
      skip: 0,
      take: 10,
      totalItemsCount: 7,
    }));
    const api = createDealerApi();
    const all = await api.search(search({ take: 10 }));
    assert.equal(all.total, 7);
    const pro = await api.search(search({ take: 10 }), {
      filter: (d) => d.partnerType === '3M™ Pro Shop Dealer',
    });
    assert.equal(pro.total, 2);
    assert.equal(pro.dealers.length, 2);
    assert.equal(calls.length, 1, 'filtering reuses the loaded list');
  });

  it('turns an error envelope into a DealerApiError with its details', async () => {
    mockFetch(json({
      error: 'Upstream returned an unsuccessful status.', stage: 'token', upstreamStatus: 500,
    }, 502));
    await assert.rejects(createDealerApi().search(search()), (e) => {
      assert.ok(e instanceof DealerApiError);
      assert.equal(e.message, 'Upstream returned an unsuccessful status.');
      assert.equal(e.status, 502);
      assert.equal(e.stage, 'token');
      assert.equal(e.upstreamStatus, 500);
      return true;
    });
    assert.equal(calls.length, 1, 'no automatic retry');
  });

  it('handles error answers that are not JSON', async () => {
    mockFetch(new Response('Bad gateway', { status: 502 }));
    await assert.rejects(
      createDealerApi().search(search()),
      (e) => e instanceof DealerApiError && e.status === 502,
    );
  });

  it('reports network failures as DealerApiError', async () => {
    mockFetch(new TypeError('Failed to fetch'));
    await assert.rejects(createDealerApi().search(search()), (e) => {
      assert.ok(e instanceof DealerApiError);
      assert.equal(e.network, true);
      return true;
    });
    assert.equal(calls.length, 1, 'no automatic retry');
  });

  it('rejects an answer without items', async () => {
    mockFetch(json({ skip: 0, take: 10 }));
    await assert.rejects(createDealerApi().search(search()), DealerApiError);
  });

  it('passes aborts through unchanged', async () => {
    const controller = new AbortController();
    mockFetch((url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const pending = createDealerApi().search(search(), { signal: controller.signal });
    controller.abort();
    await assert.rejects(pending, (e) => e.name === 'AbortError');
  });

  it('uses another endpoint with the same contract when configured', async () => {
    await createDealerApi('https://example.test/api/locator').search(search());
    assert.equal(calls[0].url.href.split('?')[0], 'https://example.test/api/locator');
  });
});

describe('locator dealer API parameters', () => {
  it('normalises values to the proxy rules', () => {
    const p = toParams({
      lat: '44.95', lon: -93, radius: 49.6, skip: -5, take: 500, region: 'ch',
    });
    assert.deepEqual(Object.fromEntries(p), {
      lat: '44.95', lon: '-93', radius: '50', skip: '0', take: String(MAX_TAKE), region: 'CH',
    });
  });

  it('falls back to the defaults', () => {
    const p = toParams({ lat: 0, lon: 0 });
    assert.equal(p.get('radius'), '50');
    assert.equal(p.get('skip'), '0');
    assert.equal(p.get('take'), '100');
    assert.equal(p.get('region'), 'US');
    assert.equal(toParams({ lat: 0, lon: 0, region: 'U S!' }).get('region'), 'US');
  });

  it('refuses a missing or out-of-range location without calling the proxy', async () => {
    assert.throws(() => toParams({ lat: 91, lon: 0 }), DealerApiError);
    assert.throws(() => toParams({ lat: 0, lon: -181 }), DealerApiError);
    assert.throws(() => toParams({ lat: null, lon: 0 }), DealerApiError);
    mockFetch(json({ items: [] }));
    await assert.rejects(createDealerApi().search(search({ lat: 'x' })), DealerApiError);
    assert.equal(calls.length, 0);
  });
});
