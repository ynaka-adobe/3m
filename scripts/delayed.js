// add delayed functionality here
import { initConsent } from './consent.js';
import initAnalytics from './analytics.js';
import initInsights from './insights.js';
import { initTarget } from './target.js';

/**
 * Consent + analytics run in the delayed phase so they cannot affect LCP/CWV.
 * Order matters: analytics and Target both subscribe to consent first, then
 * consent boots and either restores a stored decision or shows the banner.
 *
 * The insights panel is a consumer of the same data layer, and only mounts when
 * explicitly switched on with `?insights=1` — never for a normal visitor.
 */
initAnalytics()
  .then(() => initInsights())
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[analytics] init failed', e);
  })
  .finally(() => {
    // Subscribes only; at.js is not fetched until personalization is granted.
    initTarget();
    initConsent();
  });
