import { decorateIcons } from '../../scripts/aem.js';

/**
 * columns — side-by-side cells, one row per authored row.
 * Variants via block class:
 *   columns          text + image ("stackable image"): image cell sits right
 *   columns links    link-list columns (lists of links; `:icon-name:` before or
 *                    after a link's text renders a left / right icon)
 *
 * Authoring: each row is a horizontal group; each cell is one column.
 * A cell holding only a picture is tagged .columns-img-col.
 */
const ICON_TOKEN = /:([a-z0-9-]+):/g;

/**
 * Expands `:icon-name:` tokens left in link text (e.g. when content arrives
 * without the pipeline's icon conversion) into icon spans.
 * @param {Element} block
 */
function expandIconTokens(block) {
  block.querySelectorAll('a').forEach((a) => {
    [...a.childNodes].forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE || !ICON_TOKEN.test(node.textContent)) return;
      ICON_TOKEN.lastIndex = 0;
      const frag = document.createDocumentFragment();
      node.textContent.split(ICON_TOKEN).forEach((part, i) => {
        if (i % 2) {
          const span = document.createElement('span');
          span.className = `icon icon-${part}`;
          frag.append(span);
        } else if (part.trim()) {
          frag.append(part.trim());
        }
      });
      node.replaceWith(frag);
    });
  });
  decorateIcons(block);
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  if (block.classList.contains('links')) expandIconTokens(block);
}
