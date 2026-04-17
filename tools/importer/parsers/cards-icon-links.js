/* eslint-disable */
/* global WebImporter */

/**
 * cards-icon-links v10.
 * Cards block: 2 columns, multiple rows. Col 1: image/icon. Col 2: text content.
 * Source DOM: .js-whoWeAreSection with tagline h3 and .MMM--columnList with icon+link pairs.
 */
export default function parse(element, { document }) {
  const cells = [];

  // Get icon-link items from the column list
  const items = element.querySelectorAll('.MMM--columnPanel, .MMM--columnList li');

  items.forEach((item) => {
    const icon = item.querySelector('img');
    const link = item.querySelector('a');

    if (!icon && !link) return;

    // Image cell (icon)
    const imageCell = [];
    if (icon) {
      const newImg = document.createElement('img');
      newImg.src = icon.src;
      newImg.alt = icon.alt || '';
      imageCell.push(newImg);
    }

    // Text cell (linked label)
    const textCell = [];
    if (link) {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      textCell.push(a);
    }

    if (imageCell.length > 0 || textCell.length > 0) {
      cells.push([imageCell, textCell]);
    }
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-icon-links', cells });
  element.replaceWith(block);
}
