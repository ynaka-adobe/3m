/* eslint-disable */
/* global WebImporter */

/**
 * cards-news v10.
 * Cards block: 2 columns, multiple rows. Col 1: image. Col 2: text (heading, description, CTA).
 * Source DOM: .mds-content-cards_grid_card elements with image, date, h3, summary, link.
 */
export default function parse(element, { document }) {
  const cards = element.querySelectorAll('.mds-content-cards_grid_card');
  const cells = [];

  cards.forEach((card) => {
    const img = card.querySelector('img');
    const date = card.querySelector('.mds-font_body, p');
    const heading = card.querySelector('h3, [class*="header"]');
    const summary = card.querySelector('.mds-font_body-summary, .mds-font_body-summary p');
    const link = card.querySelector('a[href]');

    // Build image cell
    const imageCell = [];
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      imageCell.push(newImg);
    }

    // Build text cell: date, heading, summary, link
    const textCell = [];
    if (date) {
      const p = document.createElement('p');
      p.textContent = date.textContent.trim();
      textCell.push(p);
    }
    if (heading) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      textCell.push(h);
    }
    if (summary) {
      const p = document.createElement('p');
      p.textContent = summary.textContent.trim();
      textCell.push(p);
    }
    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = heading ? heading.textContent.trim() : 'Read more';
      textCell.push(a);
    }

    if (imageCell.length > 0 || textCell.length > 0) {
      cells.push([imageCell, textCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-news', cells });
  element.replaceWith(block);
}
