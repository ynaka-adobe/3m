/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: 3M site-wide DOM cleanup.
 *
 * Selectors below are all verified against migration-work/cleaned.html
 * (the captured DOM of https://www.3m.com/3M/en_US/government-us/).
 *
 * Note on non-authorable chrome: the global header (#top, nav.m-nav) and
 * footer (div.m-footer) are NOT present in cleaned.html — the scraper already
 * stripped the site shell, so cleaned.html contains only the main content
 * (div.MDS#pageContent). The one remaining non-authorable element is the
 * breadcrumb trail (ol.MMM--breadcrumbs-list) inside div.MMM--siteNav.
 * The page H1 ("3M Government") is intentionally KEPT as authorable default
 * content (see migration-work/authoring-analysis.json -> precedingDefaultContent).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Breadcrumb navigation is non-authorable chrome; remove before block
    // parsing so it never lands in any block cell. The <h1> in the same
    // MMM--siteNav wrapper is preserved (authored default content).
    // Found in captured DOM: <ol class="MMM--breadcrumbs-list"> ... </ol>
    WebImporter.DOMUtils.remove(element, ['ol.MMM--breadcrumbs-list']);
  }

  if (hookName === TransformHook.afterTransform) {
    // Safe removal of non-authorable / non-content elements if any remain.
    WebImporter.DOMUtils.remove(element, [
      'noscript',
      'link',
      'iframe',
      'source',
    ]);

    // Strip presentational/tracking attributes that are not authorable.
    // Found in captured DOM: role="img"/alt on div.MDS-bannerHero_imgContainer,
    // plus generic style/on* handlers that may appear on nested nodes.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('style');
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
    });
  }
}
