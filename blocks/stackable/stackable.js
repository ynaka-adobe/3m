/**
 * stackable (rMDS-206) — alternating media/text rows. The workhorse layout for
 * L2 pages: each row pairs an image with a block of copy, flipping side as you
 * scroll. Variants via block class:
 *   stackable reverse   start with media on the right
 *   stackable stacked   never alternate — media always leads
 *
 * Authoring (one row per item; cells in order, all optional):
 *   1. media        an authored <img>/<picture>, OR a root-relative path
 *                   text ("/img/3m/<slug>/panel.jpg") built into an <img>
 *                   client-side so committed brand imagery survives
 *   2. title        heading or plain text
 *   3. body         paragraph(s) and/or bullet list — rich content preserved
 *   4. cta          one or more <a> — rendered as buttons
 *
 * Section head (eyebrow/heading/lede) is authored as default content above the
 * block; this block leaves it untouched.
 */
const IMG_PATH = /^\/[\w./-]+\.(jpg|jpeg|png|webp|avif|svg)$/i;

function buildMedia(cell) {
  const img = document.createElement('img');
  img.src = cell.textContent.trim();
  img.alt = '';
  img.loading = 'lazy';
  cell.replaceChildren(img);
  return img;
}

export default function decorate(block) {
  const rows = [...block.children];
  const list = document.createElement('div');
  list.className = 'stackable-items';

  rows.forEach((row, i) => {
    const cells = [...row.children];
    let picture = row.querySelector('picture, img');
    const pathCell = cells.find((c) => IMG_PATH.test(c.textContent.trim()));
    if (!picture && pathCell) picture = buildMedia(pathCell);

    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const links = [...row.querySelectorAll('a')];

    const item = document.createElement('div');
    item.className = 'stackable-item';
    // alternate unless the author pinned the order
    if (!block.classList.contains('stacked') && i % 2 === 1) {
      item.classList.add('is-flipped');
    }

    if (picture) {
      const media = document.createElement('div');
      media.className = 'stackable-media';
      media.append(picture.closest('picture') || picture);
      item.append(media);
    }

    const text = document.createElement('div');
    text.className = 'stackable-text';

    if (heading) {
      const h = document.createElement('h3');
      h.append(...heading.childNodes);
      text.append(h);
    }

    // body cell: the first cell that is neither media, heading, nor a lone CTA
    const bodyCell = cells.find((c) => {
      if (c === pathCell) return false;
      if (picture && c.contains(picture)) return false;
      if (heading && c.contains(heading)) return false;
      if (!c.textContent.trim()) return false;
      // a cell that is only links is the CTA cell, not body copy
      const cellLinks = [...c.querySelectorAll('a')];
      const onlyLinks = cellLinks.length > 0
        && c.textContent.trim() === cellLinks.map((a) => a.textContent.trim()).join('');
      return !onlyLinks;
    });
    if (bodyCell) {
      const rich = bodyCell.querySelector('p, ul, ol');
      if (rich) {
        [...bodyCell.childNodes].forEach((n) => text.append(n.cloneNode(true)));
      } else {
        const p = document.createElement('p');
        p.textContent = bodyCell.textContent.trim();
        text.append(p);
      }
    }

    // CTAs: any link not already carried in with the body copy
    const ctas = links.filter((a) => !bodyCell || !bodyCell.contains(a));
    if (ctas.length) {
      const actions = document.createElement('div');
      actions.className = 'stackable-actions';
      ctas.forEach((a, n) => {
        a.classList.add('button', n === 0 ? 'primary' : 'secondary');
        actions.append(a);
      });
      text.append(actions);
    }

    item.append(text);
    list.append(item);
  });

  block.replaceChildren(list);
}
