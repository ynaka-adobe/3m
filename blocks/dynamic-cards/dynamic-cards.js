/**
 * dynamic-cards — index block that fetches the EDS query-index and renders a
 * card grid of pages, filtered by template.
 *
 * Authoring (one cell per row, all optional):
 *   1. template   the page template to list (e.g. "industry-landing")
 *   2. index      query-index path (default /3m/en_us/query-index.json)
 *
 * Reads the section head (heading/lede) authored as default content above it.
 */
// Static index served from the code bus (the EDS query-index service is not
// enabled for this site config; this JSON is regenerated when content changes).
const DEFAULT_INDEX = '/site-index.json';

const TITLE_OVERRIDE = {
  'building-construction-us': 'Building & Construction',
  'electrical-construction-maintenance-us': 'Electrical, Construction & Maintenance',
  'worker-health-safety-us': 'Worker Health & Safety',
  'architectural-design-us': 'Architectural Design',
  'auto-care-us': 'Auto Care',
  'home-improvement-us': 'Home Improvement',
  'road-safety-us': 'Road Safety',
  'defense-markets-us': 'Defense Markets',
  'facility-management-us': 'Facility Management',
  ppe: 'Personal Protective Equipment',
};

// Clean, predictable titles from the slug (the raw page <title> is noisy);
// override the few multi-word / acronym cases.
function titleFor(row) {
  const slug = row.path.split('/').filter(Boolean).pop();
  if (TITLE_OVERRIDE[slug]) return TITLE_OVERRIDE[slug];
  return slug.replace(/-us$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const template = (cells[0]?.textContent || '').trim();
  const indexPath = (cells[1]?.textContent || '').trim() || DEFAULT_INDEX;

  const ul = document.createElement('ul');
  block.replaceChildren(ul);

  try {
    const resp = await fetch(indexPath);
    const json = await resp.json();
    let rows = json.data || [];
    if (template) rows = rows.filter((r) => r.template === template);
    rows.sort((a, b) => titleFor(a).localeCompare(titleFor(b)));

    if (!rows.length) {
      block.innerHTML = '<p class="dyn-empty">No items found.</p>';
      return;
    }

    rows.forEach((row) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'card';
      a.href = row.path;
      const body = document.createElement('div');
      body.className = 'card-body';
      const h = document.createElement('h3');
      h.textContent = titleFor(row);
      body.append(h);
      const desc = (row.description || '').trim();
      if (desc) {
        const p = document.createElement('p');
        p.textContent = desc.length > 150 ? `${desc.slice(0, 147)}…` : desc;
        body.append(p);
      }
      const arrow = document.createElement('span');
      arrow.className = 'card-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '&rsaquo;';
      body.append(arrow);
      a.append(body);
      li.append(a);
      ul.append(li);
    });
  } catch (e) {
    block.innerHTML = '<p class="dyn-empty">Unable to load items right now.</p>';
  }
}
