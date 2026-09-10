/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero.
 * Base block: hero (local 3M block).
 * Source: https://www.3m.com/3M/en_US/government-us/ (div.MDS-bannerHero)
 * Generated for 3M Government landing migration.
 *
 * Hero convention: 1 column, 3 rows.
 *   Row 1: block name.
 *   Row 2: background image (one cell, optional).
 *   Row 3: content cell (title, optional subheading, optional CTA).
 * Source provides a background image + headline only.
 */
export default function parse(element, { document }) {
  // Background image lives in the img container.
  const bgImage = element.querySelector(
    '.MDS-bannerHero_imgContainer img, .MDS-bannerHero_imgContainer picture, img, picture',
  );
  // Headline (rendered as the hero title).
  const heading = element.querySelector(
    '.MDS-bannerHero_content h1, .MDS-bannerHero_content h2, .MDS-bannerHero_content h3, h1, h2, h3',
  );

  if (!bgImage && !heading) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // Row 2: background image (one cell).
  if (bgImage) cells.push([bgImage]);
  // Row 3: content cell — title (+ any additional overlay text) in a single cell.
  const contentCell = [];
  if (heading) contentCell.push(heading);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
