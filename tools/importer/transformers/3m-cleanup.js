/* eslint-disable */
/* global WebImporter */

/**
 * 3M cleanup v10
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Remove cookie consent and overlays
    WebImporter.DOMUtils.remove(element, [
      '[id*="cookie"]',
      '[class*="cookie"]',
      '[id*="consent"]',
      '[class*="consent"]',
      'dialog',
      '.m-header_overlay',
      '[class*="Feedback"]',
    ]);

    // Remove whitespace-only paragraphs that come from 3M's template nesting
    element.querySelectorAll('p').forEach((p) => {
      if (/^\s*$/.test(p.textContent) && !p.querySelector('img, picture, a')) {
        p.remove();
      }
    });

    // Remove empty divs
    element.querySelectorAll('div').forEach((div) => {
      if (div.textContent.trim() === '' && !div.querySelector('img, picture, video, a, table, input')) {
        div.remove();
      }
    });
  }

  if (hookName === H.after) {
    // Remove non-authorable content: header, footer, nav, skip-links, sign-in popups
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'nav',
      '.MMM--siteNav',
      '.hiddenWidgetsDiv',
      '.is-dropdown',
      '.m-header-madbar',
      '.m-navbar',
      '.m-navbar-noStyle',
      '.is-signInPopUp',
      '.m-header--fix',
      '.MAD-Bar',
      '[class*="skip-nav"]',
      '[name="Follower"]',
      '[name="SideBar"]',
      '[name="ibmMainContainer"]',
      'iframe',
      'link',
      'noscript',
    ]);

    // Remove skip-nav link lists (Go to US Navigation, etc.)
    element.querySelectorAll('ul').forEach((ul) => {
      if (ul.textContent.includes('Go to US Navigation') || ul.textContent.includes('Go to Page Content')) {
        ul.remove();
      }
    });

    // Remove empty component containers
    element.querySelectorAll('.component-container, .component-control').forEach((container) => {
      if (container.textContent.trim() === '' && !container.querySelector('img, picture')) {
        container.remove();
      }
    });

    // Second pass: remove any remaining whitespace-only paragraphs
    element.querySelectorAll('p').forEach((p) => {
      if (/^\s*$/.test(p.textContent) && !p.querySelector('img, picture, a')) {
        p.remove();
      }
    });

    // Fix escaped quote URLs
    element.querySelectorAll('a[href]').forEach((a) => {
      const href = a.getAttribute('href');
      if (href) {
        a.setAttribute('href', href.replace(/\\"/g, '').replace(/%5C%22/g, ''));
      }
    });

    element.querySelectorAll('img[src]').forEach((img) => {
      const src = img.getAttribute('src');
      if (src) {
        img.setAttribute('src', src.replace(/\\"/g, '').replace(/%5C%22/g, ''));
      }
    });
  }
}
