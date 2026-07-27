/**
 * footer — 3M site footer (self-contained for this presales build).
 * Multi-column site map + social + legal, on the ink ground.
 */

// Links point to delivered local pages where one exists; otherwise an absolute
// 3m.com bounce (a working source page beats a dead local link).
const SRC = 'https://www.3m.com/3M/en_US';
const COLUMNS = [
  {
    h: 'Products',
    links: [
      { t: 'All products', href: '/3m/en_us/products' },
      { t: 'Adhesives & tapes', href: '/3m/en_us/p/c/adhesives' },
      { t: 'Personal protective equipment', href: '/3m/en_us/p/c/ppe' },
      { t: 'Office supplies', href: '/3m/en_us/p/c/office-supplies' },
    ],
  },
  {
    h: 'Industries',
    links: [
      { t: 'All industries', href: '/3m/en_us/industries' },
      { t: 'Building & construction', href: '/3m/en_us/building-construction-us' },
      { t: 'Transportation', href: '/3m/en_us/transportation-us' },
      { t: 'Worker health & safety', href: '/3m/en_us/worker-health-safety-us' },
    ],
  },
  {
    h: 'Company',
    links: [
      { t: 'About 3M', href: '/3m/en_us/about-3m' },
      { t: 'Careers', href: '/3m/en_us/careers-us' },
      { t: 'Sustainability', href: '/3m/en_us/sustainability-us' },
      { t: 'Investors', href: 'https://investors.3m.com/' },
    ],
  },
  {
    h: 'Support',
    links: [
      { t: 'Contact us', href: `${SRC}/company-us/` },
      { t: 'Site map', href: `${SRC}/company-us/site-map/` },
      { t: 'SDS / regulatory', href: `${SRC}/company-us/SDS-search/` },
      { t: 'Where to buy', href: `${SRC}/company-us/where-to-buy/` },
    ],
  },
];

const SOCIAL = [
  { t: 'LinkedIn', href: 'https://www.linkedin.com/company/3m' },
  { t: 'YouTube', href: 'https://www.youtube.com/user/3M' },
  { t: 'Facebook', href: 'https://www.facebook.com/3M' },
  { t: 'Instagram', href: 'https://www.instagram.com/3m' },
];
const LEGAL = [
  { t: 'Privacy', href: `${SRC}/company-us/privacy-policy/` },
  { t: 'Terms', href: `${SRC}/company-us/legal-information/` },
  { t: 'Cookie Preferences', href: '#' },
];

export default async function decorate(block) {
  const f = document.createElement('div');
  f.className = 'footer-3m';

  const cols = COLUMNS.map((c) => `
    <div class="footer-col">
      <h4>${c.h}</h4>
      ${c.links.map((l) => `<a href="${l.href}">${l.t}</a>`).join('')}
    </div>`).join('');

  f.innerHTML = `
    <div class="footer-top">
      <div class="footer-brand">
        <div class="footer-logo">3M</div>
        <p>Science. Applied to Life.</p>
      </div>
      ${cols}
    </div>
    <div class="footer-legal">
      <span>© 2026 3M. All rights reserved.</span>
      ${LEGAL.map((l) => `<a href="${l.href}">${l.t}</a>`).join('')}
      <span class="footer-social">${SOCIAL.map((s) => `<a href="${s.href}" target="_blank" rel="noopener">${s.t}</a>`).join('')}</span>
    </div>`;

  block.replaceChildren(f);
}
