import { decorateBlock, getMetadata, loadBlock } from './aem.js';
import decorateButtons from './buttons.js';
import { hasConsent, onConsentChange } from './consent.js';

/**
 * Consent category that governs Adobe Target. at.js sets its own identity
 * cookies and calls the Target edge, so it is personalization/advertising —
 * not strictly necessary, and not analytics.
 */
const CONSENT_CATEGORY = 'personalization';

/**
 * Target offers deliver raw EDS block markup (e.g. a fragment's plain.html)
 * directly into the DOM, bypassing the page's normal decorateBlocks()/loadBlock()
 * pass. Run that pipeline on whatever Target just injected so blocks like
 * `hero` get their CSS/JS decoration instead of rendering as raw markup.
 * @param {Element} container
 */
async function decorateInjectedBlocks(container) {
  // Target-injected markup never passes through decorateMain(), so <strong><a>
  // / <em><a> would stay bare links instead of becoming .button/.button.secondary.
  decorateButtons(container);
  const blocks = container.querySelectorAll('div[class]:not([data-block-status])');
  await Promise.all([...blocks].map(async (block) => {
    decorateBlock(block);
    await loadBlock(block);
  }));
}

/** AEM Universal Editor iframe; skip Target so at.js does not fight UE/CSP. */
export function isUePreviewHost(hostname = window.location.hostname) {
  return /\.(?:stage-ue|ue)\.da\.live$/.test(hostname);
}

/**
 * Placeholder values that shipped as commented-out examples in head.html. If one
 * of these is ever authored for real it would override at.js's own correct
 * `serverDomain` (which is built into vendor-at.js as the tenant's edge host)
 * with an unroutable hostname, silently breaking every Target call. Treat them
 * as "not configured" and let at.js use its built-in default.
 * @type {Set<string>}
 */
const PLACEHOLDER_DOMAINS = new Set(['your.target.edge.hostname']);

/** @returns {string|undefined} an authored edge host override, if it is usable */
function targetServerDomain() {
  const domain = getMetadata('target-server-domain')?.trim();
  if (!domain || PLACEHOLDER_DOMAINS.has(domain.toLowerCase())) return undefined;
  return domain;
}

/**
 * @param {unknown} e
 * @param {Element} [el]
 */
function logTargetError(e, el) {
  // eslint-disable-next-line no-console
  console.error('[target]', e, el);
}

export async function loadTarget() {
  if (isUePreviewHost()) return;
  const targetMeta = getMetadata('target');
  if (!targetMeta) return;
  // Belt and braces: the gate also lives in initTarget(), but guarding here
  // means at.js cannot be loaded by any other call path without consent.
  if (!hasConsent(CONSENT_CATEGORY)) return;

  const serverDomain = targetServerDomain();
  window.targetGlobalSettings = {
    secureOnly: true,
    overrideMboxEdgeServer: false,
    ...(serverDomain ? { serverDomain } : {}),
  };

  try {
    await import('../deps/at/at.js');
    const pageLoadRequest = { execute: { pageLoad: {} } };
    const offers = await window.adobe.target.getOffers({
      request: pageLoadRequest,
    });

    if (typeof window.adobe.target.applyOffers === 'function') {
      // at.js writes the offer markup itself, so we never see the container it
      // touched. Without decorating afterwards, a pageLoad offer containing an
      // EDS block renders as undecorated raw markup (no block CSS/JS).
      //
      // Scope this to the selectors the offer actually names. Decorating
      // document.body instead would hand every section wrapper and inner div
      // (.cc-inner, .footer-logo, ...) to decorateBlock(), inventing blocks that
      // do not exist and 404ing on their CSS/JS.
      const targets = (offers?.execute?.pageLoad?.options || [])
        .flatMap((opt) => opt?.content || [])
        .map((c) => c?.cssSelector)
        .filter(Boolean);
      if (targets.length) {
        document.addEventListener('at-content-rendering-succeeded', () => {
          targets.forEach((sel) => {
            const el = document.querySelector(sel);
            if (el) decorateInjectedBlocks(el.parentElement || el);
          });
        }, { once: true });
      }
      await window.adobe.target.applyOffers({
        request: pageLoadRequest,
        response: offers,
      });
    } else {
      offers?.execute?.pageLoad?.options?.forEach((opt) => {
        const payload = opt?.content?.[0];
        if (!payload) return;
        const { cssSelector, content } = payload;
        if (!cssSelector || content == null) return;
        const el = document.querySelector(cssSelector);
        if (!el) return;
        const { parentElement } = el;
        el.outerHTML = content;
        if (parentElement) decorateInjectedBlocks(parentElement);
      });
    }
  } catch (e) {
    logTargetError(e, document.body);
  }
}

/**
 * Legacy mbox flow (getOffer + applyOffer). Runs after blocks render.
 * Opt-in via meta target-mbox-hero and optional target-mbox-hero-selector.
 */
export async function applyTargetHeroMboxIfConfigured() {
  if (isUePreviewHost()) return;
  const mbox = getMetadata('target-mbox-hero')?.trim();
  if (!mbox) return;
  if (!hasConsent(CONSENT_CATEGORY)) return;

  const configured = getMetadata('target-mbox-hero-selector')?.trim();
  if (!configured) {
    // There is deliberately no default. The previous fallback
    // ('.hero-promo, .hero.block .hero-inner') matched nothing in this repo, so
    // the offer silently never applied — the worst possible failure mode for a
    // personalization demo. Fail loudly instead.
    logTargetError(
      `target-mbox-hero "${mbox}" is set but target-mbox-hero-selector is not. `
      + 'Set it to a selector that exists on the page, e.g. ".hero.block".',
    );
    return;
  }
  const selectorList = configured
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const t = window.adobe?.target;
  if (!t?.getOffer || !t?.applyOffer) return;

  const activity = getMetadata('activity')?.trim();
  const params = activity ? { activity } : undefined;

  const resolveSelector = () => {
    for (let i = 0; i < selectorList.length; i += 1) {
      const els = [...document.querySelectorAll(selectorList[i])];
      if (els.length) return { els, selector: selectorList[i] };
    }
    return null;
  };

  await new Promise((resolve) => {
    t.getOffer({
      mbox,
      params,
      success(offers) {
        const match = resolveSelector();
        if (!match) {
          logTargetError(
            `target-mbox-hero-selector "${configured}" matched no element; `
            + 'the Target offer was fetched but cannot be applied.',
          );
          resolve();
          return;
        }
        // at.js applies the offer to EVERY element matching the selector, and
        // replaces them outright — so capture the parents now, while the
        // original elements are still attached, and decorate those afterwards.
        const containers = [...new Set(
          match.els.map((el) => el.parentElement).filter(Boolean),
        )];
        document.addEventListener('at-content-rendering-succeeded', () => {
          containers.forEach((el) => decorateInjectedBlocks(el));
        }, { once: true });
        t.applyOffer({ mbox, selector: match.selector, offer: offers });
        resolve();
      },
      error: resolve,
    });
  });
}

/**
 * Consent-gated entry point for Adobe Target.
 *
 * Historically `loadTarget()` was awaited inside `loadPage()`, before the
 * delayed phase. Consent lives in the delayed phase, so at.js loaded before the
 * visitor had agreed to anything — personalization ran on an opt-out basis.
 *
 * This moves Target behind `onConsentChange`, so:
 *  - no `target` meta          → nothing happens at all (the common case)
 *  - meta present, no consent  → at.js is never fetched, zero calls to the edge
 *  - personalization granted   → at.js loads and offers apply
 *
 * Revoking afterwards cannot unload a script that is already running, but we
 * only ever request offers once at load, so no further Target calls are made
 * and the next page view starts clean.
 */
export function initTarget() {
  if (isUePreviewHost()) return;
  // Avoid subscribing on the vast majority of pages that never use Target.
  if (!getMetadata('target') && !getMetadata('target-mbox-hero')) return;

  let started = false;
  onConsentChange(async (categories) => {
    if (started || categories?.[CONSENT_CATEGORY] !== true) return;
    started = true;
    await loadTarget();
    await applyTargetHeroMboxIfConfigured();
  });
}
