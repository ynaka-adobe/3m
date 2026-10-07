/**
 * Real-time visitor identity, captured from the Marketo quote form.
 *
 * When a visitor submits the "Get a quote" form — from the Marketo block or
 * from the locator's modal — Marketo hands us the submitted values client-side.
 * This module keeps the latest submission in memory so the insights panel can
 * show what a first-party identity actually looks like at the moment it is
 * created, instead of describing it in the abstract.
 *
 * ── Why this is deliberately NOT on the data layer ────────────────────────
 * Everything pushed to `window.adobeDataLayer` is forwarded verbatim to the
 * configured transport — AppMeasurement or Web SDK — and from there to Adobe.
 * Names, email addresses and phone numbers must not take that path: sending
 * direct identifiers into a report suite is a real compliance problem, not a
 * stylistic one, and it is not something a demo should model as acceptable.
 *
 * So identity travels on its own in-memory channel, read only by the panel.
 * `analytics.js` continues to emit `form-submit` with the component and form
 * name and no field values, which is the event that reaches Adobe.
 *
 * ── Retention ─────────────────────────────────────────────────────────────
 * Memory only, for the life of the page. Nothing is written to localStorage,
 * sessionStorage or a cookie, and nothing is logged to the console. A reload
 * clears it. Capture is also gated on analytics consent: if the visitor has
 * not opted in, a submission is never retained here at all.
 *
 * ── Demo mode only ────────────────────────────────────────────────────────
 * `observeIdentity` is called exclusively by the insights panel, which needs
 * `?insights=1`. A normal visitor never runs any of this.
 *
 * ── A note for anyone testing this ────────────────────────────────────────
 * Marketo will not accept a submission from an unrecognised origin, so on
 * localhost the POST never happens and `onSuccess` never fires — the form just
 * sits there. Verify on a deployed preview or on the live domain instead.
 */

import { hasConsent, onConsentChange } from './consent.js';

/** Marketo plumbing that is not visitor-supplied and never worth showing. */
const SYSTEM_FIELDS = new Set([
  'formid', 'munchkinId', 'formVid', 'lpId', 'subId', 'kw', 'cr', 'searchstr',
  'queryStr', '_mkt_trk', 'returnLPId', 'retURL', 'mkt_tok',
]);

/**
 * Fields we treat as direct identifiers. They are still displayed — the point
 * of the card is to show a real identity forming — but they are flagged so the
 * panel can mark them, and so anyone reading this knows exactly which values
 * are sensitive if this module is ever reused.
 */
const DIRECT_IDENTIFIERS = new Set(['Email', 'Phone', 'FirstName', 'LastName']);

const listeners = new Set();
let current = null;
let hooked = false;

/** Tidies a Marketo label: "*Email Address:" → "Email Address". */
function cleanLabel(raw, fallback) {
  const text = (raw || '')
    .replace(/\s+/g, ' ')
    .replace(/^\*/, '')
    .replace(/:$/, '')
    .trim();
  return text || fallback;
}

/** Field name → readable title: "FirstName" → "First Name", "year" → "Year". */
function humanise(name) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Reads the visitor-supplied fields out of a Marketo form element.
 *
 * `form.vals()` only returns fields Marketo has mapped to lead attributes — on
 * the 3M quote form that is name, email and phone, but not the vehicle or
 * product fields the visitor also filled in. So the DOM is the source of truth
 * for what was typed, and `vals()` is merged over it for anything Marketo knows
 * about that is not rendered as an input.
 *
 * @param {Element} formEl the `<form>` element
 * @param {Object} vals Marketo's own value map
 * @returns {Array<{name: string, label: string, value: string, sensitive: boolean}>}
 */
function readFields(formEl, vals) {
  const byName = new Map();

  const put = (name, label, value, sensitive) => {
    if (!name || SYSTEM_FIELDS.has(name) || !value) return;
    byName.set(name, {
      name, label, value, sensitive,
    });
  };

  if (formEl) {
    formEl.querySelectorAll('input, select, textarea').forEach((input) => {
      const { name, type } = input;
      if (!name || type === 'hidden' || SYSTEM_FIELDS.has(name)) return;
      const label = cleanLabel(
        formEl.querySelector(`label[for="${input.id}"]`)?.textContent,
        name,
      );
      const sensitive = DIRECT_IDENTIFIERS.has(name);

      if (type === 'checkbox' || type === 'radio') {
        if (!input.checked) return;
        // Several checkboxes share one name (e.g. `product`), and each one's
        // label is the choice rather than the field. Collect the checked
        // labels into a single entry titled after the field itself.
        const existing = byName.get(name);
        put(
          name,
          humanise(name),
          existing ? `${existing.value}, ${label}` : label,
          sensitive,
        );
        return;
      }
      put(name, label, input.value.trim(), sensitive);
    });
  }

  Object.entries(vals || {}).forEach(([name, value]) => {
    if (byName.has(name)) return;
    put(name, humanise(name), typeof value === 'string' ? value.trim() : '', DIRECT_IDENTIFIERS.has(name));
  });

  return [...byName.values()];
}

/** Notifies the panel. Listener errors must not break form submission. */
function emit() {
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch (e) {
      /* a broken listener is not worth failing a lead capture over */
    }
  });
}

function capture(form) {
  if (!hasConsent('analytics')) return;
  const formEl = form.getFormElem?.()[0];
  const fields = readFields(formEl, form.vals?.());
  if (!fields.length) return;
  current = {
    fields,
    source: formEl?.closest('[data-block-name], .block')?.dataset.blockName
      || (formEl?.closest('.modal, dialog') ? 'quote modal' : 'marketo'),
    formId: form.getId?.() ?? null,
    at: new Date(),
  };
  emit();
}

/**
 * Subscribes to identity updates. Fires immediately with the current profile
 * if one already exists, so a panel opened after a submission is not blank.
 *
 * @param {Function} fn receives the profile, or null when there is none
 * @returns {Function} unsubscribe
 */
export function onIdentity(fn) {
  listeners.add(fn);
  if (current) fn(current);
  return () => listeners.delete(fn);
}

/** @returns {Object|null} the current in-memory profile */
export function getIdentity() {
  return current;
}

/**
 * Starts listening for Marketo submissions. Safe to call more than once.
 *
 * Marketo loads asynchronously and may not be present at all on pages without
 * a form, so this polls briefly and then gives up rather than waiting forever.
 */
export function observeIdentity() {
  if (hooked) return;
  hooked = true;

  // Dropping consent must drop the captured profile with it, otherwise a
  // visitor who opts out still has their details sitting in memory.
  onConsentChange(() => {
    if (!hasConsent('analytics') && current) {
      current = null;
      emit();
    }
  });

  const hook = () => {
    if (!window.MktoForms2?.whenReady) return false;
    window.MktoForms2.whenReady((form) => {
      // `onSuccess` fires after Marketo has accepted the submission, so the
      // values are the ones actually taken, not an abandoned draft.
      form.onSuccess(() => {
        capture(form);
        // Returning false cancels Marketo's follow-up navigation. Without it
        // the page reloads immediately and the profile — which is held in
        // memory by design — is gone before anyone can look at it. The lead is
        // still saved; only the redirect is suppressed.
        //
        // This is safe to do unconditionally because `observeIdentity` is only
        // ever called by the insights panel, which requires `?insights=1`. A
        // normal visitor never reaches this code and still gets the redirect.
        // Marketo cancels the follow-up if *any* handler returns false, so the
        // `form-submit` handler in analytics.js is unaffected.
        return false;
      });
    });
    return true;
  };

  if (hook()) return;
  let attempts = 0;
  const poll = window.setInterval(() => {
    attempts += 1;
    if (hook() || attempts > 40) window.clearInterval(poll);
  }, 500);
}

export default observeIdentity;
