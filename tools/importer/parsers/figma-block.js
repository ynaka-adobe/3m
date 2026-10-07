/* eslint-disable */
/* global WebImporter */
/**
 * Parser for Figma design-snapshot blocks.
 * Source: migration-work/figma-source/** (pages transcribed from Figma frames).
 *
 * Snapshot convention:
 *   <div class="figma-block" data-block="cards (mds)">
 *     <div class="row"><div class="cell">…</div><div class="cell">…</div></div>
 *   </div>
 * data-block is the EDS block name (with variants in parentheses); each .row
 * becomes a block row and each .cell a cell, with cell content moved as-is.
 */
export default function parse(element, { document }) {
  const name = (element.getAttribute('data-block') || '').trim();
  if (!name) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [...element.querySelectorAll(':scope > .row')].map((row) => (
    [...row.querySelectorAll(':scope > .cell')].map((cell) => [...cell.childNodes])
  ));

  const block = WebImporter.Blocks.createBlock(document, { name, cells });
  element.replaceWith(block);
}
