/**
 * image-features (rMDS-217) — a supporting image paired with an auto-numbered
 * list of features. Numbering is generated, so authors reorder rows freely
 * without renumbering by hand.
 *
 * Variants via block class:
 *   image-features right    image on the right (default: left)
 *   image-features plain    suppress the number badges
 *
 * Authoring:
 *   row 1        media — an authored <img>/<picture>, OR a root-relative path
 *                text ("/img/3m/<slug>/features.jpg")
 *   rows 2..n    1. title   feature name (heading or plain text)
 *                2. body    supporting copy (optional)
 */
const IMG_PATH = /^\/[\w./-]+\.(jpg|jpeg|png|webp|avif|svg)$/i;

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const wrap = document.createElement('div');
  wrap.className = 'if-inner';

  // first row that carries an image (authored or as a path) is the media row
  const mediaRow = rows.find((r) => {
    if (r.querySelector('picture, img')) return true;
    return [...r.children].some((c) => IMG_PATH.test(c.textContent.trim()));
  });

  if (mediaRow) {
    let picture = mediaRow.querySelector('picture, img');
    if (!picture) {
      const cell = [...mediaRow.children].find((c) => IMG_PATH.test(c.textContent.trim()));
      const img = document.createElement('img');
      img.src = cell.textContent.trim();
      img.alt = '';
      img.loading = 'lazy';
      picture = img;
    }
    const media = document.createElement('div');
    media.className = 'if-media';
    media.append(picture.closest('picture') || picture);
    wrap.append(media);
  }

  const ol = document.createElement('ol');
  ol.className = 'if-list';

  rows.filter((r) => r !== mediaRow).forEach((row) => {
    const cells = [...row.children].filter((c) => c.textContent.trim());
    if (!cells.length) return;

    const li = document.createElement('li');
    li.className = 'if-item';

    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const titleText = heading ? heading.textContent.trim() : cells[0].textContent.trim();

    const body = document.createElement('div');
    body.className = 'if-item-body';

    const h = document.createElement('h3');
    h.textContent = titleText;
    body.append(h);

    const descCell = cells.find((c) => {
      const t = c.textContent.trim();
      return t && t !== titleText;
    });
    if (descCell) {
      const rich = descCell.querySelector('p, ul, ol');
      if (rich) {
        [...descCell.childNodes].forEach((n) => body.append(n.cloneNode(true)));
      } else {
        const p = document.createElement('p');
        p.textContent = descCell.textContent.trim();
        body.append(p);
      }
    }

    li.append(body);
    ol.append(li);
  });

  if (ol.children.length) {
    const text = document.createElement('div');
    text.className = 'if-text';
    text.append(ol);
    wrap.append(text);
  }

  block.replaceChildren(wrap);
}
