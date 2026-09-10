/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-links.
 * Base block: cards (local 3M block), "links" variant.
 * Source: https://www.3m.com/3M/en_US/government-us/ (div.MDS-cardsIconBlock)
 * Generated for 3M Government landing migration.
 *
 * cards convention: 2 columns, multiple rows.
 *   Row 1: block name (+ variant).
 *   Each card row: cell 1 = image/icon, cell 2 = text content
 *     (title, description, optional CTA linked text).
 * Section heading (h3) stays as default content OUTSIDE the block.
 * Source: ul > li, each li has an icon img, an <a> linked title, and a <p> caption.
 */
export default function parse(element, { document }) {
  const items = element.querySelectorAll(':scope ul > li');

  const cells = [];
  items.forEach((li) => {
    const img = li.querySelector('img, picture');
    const link = li.querySelector('a');
    const caption = li.querySelector('p');

    // Cell 2: text content — linked title, then description.
    const content = [];
    if (link) content.push(link);
    if (caption) content.push(caption);

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

  const block = WebImporter.Blocks.createBlock(document, { name: 'Cards (links)', cells });
  element.replaceWith(...preserved, block);
}
