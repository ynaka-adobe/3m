// add delayed functionality here
import { initConsent } from './consent.js';
import initAnalytics from './analytics.js';

/**
 * Consent + analytics run in the delayed phase so they cannot affect LCP/CWV.
 * Order matters: analytics subscribes to consent first, then consent boots and
 * either restores a stored decision or shows the banner.
 */
initAnalytics()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[analytics] init failed', e);
  })
  .finally(() => initConsent());
