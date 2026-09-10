/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards (base variant).
 * Base block: cards (local 3M block).
 * Source: https://www.3m.com/3M/en_US/government-us/
 *   Instance A: div.MDS-cardsArticles (proof-is-in-the-science)
 *   Instance B: div.MDS-cardsContentComplex.mds-3cards-container-w (keep-exploring)
 * Generated for 3M Government landing migration.
 *
 * cards convention: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: cell 1 = image, cell 2 = text content
 *     (title as heading, description, whole-card CTA link).
 * Headings + <hr> stay as default content OUTSIDE the block.
 * Both instances: ul > li, each li wraps content in an <a> (whole-card link)
 * with an image, a title, and a body/description.
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll(':scope ul > li');

  const cells = [];
  items.forEach((li) => {
    const cardLink = li.querySelector('a');
    const img = li.querySelector('img, picture');
    // Title: article link title OR complex-card header.
    const titleEl = li.querySelector('.MDS-core_link--secondary, .mds-font_header--5');
    // Body/description: article body OR the non-title detail div.
    let bodyEl = li.querySelector('.MDS-core_body');
    if (!bodyEl) {
      const details = li.querySelector('.MDS-cardsContentComplex_cardDetails');
      if (details) {
        bodyEl = [...details.children].find((c) => c !== titleEl && c.textContent.trim());
      }
    }

    const content = [];
    if (titleEl) {
      const h = document.createElement('h3');
      h.textContent = titleEl.textContent.trim();
      content.push(h);
    }
    if (bodyEl) {
      const p = document.createElement('p');
      p.textContent = bodyEl.textContent.trim();
      content.push(p);
    }
    if (cardLink) {
      const a = document.createElement('a');
      a.setAttribute('href', cardLink.getAttribute('href'));
      a.textContent = titleEl ? titleEl.textContent.trim() : (cardLink.textContent.trim() || 'Learn more');
      content.push(a);
    }

    cells.push([img || '', content]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Preserve the section heading (and any rule) as default content ABOVE the block.
  const ul = element.querySelector(':scope ul');
  const preserved = [...element.querySelectorAll('hr, h1, h2, h3, h4, h5, h6')]
    .filter((n) => !ul || !ul.contains(n));

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(...preserved, block);
}
