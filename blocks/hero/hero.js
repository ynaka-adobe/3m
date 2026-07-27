/**
 * hero — full-bleed static image hero with headline overlay.
 *
 * Authoring (one cell per row, in order; any optional):
 *   1. background image       a root-relative path text ("/img/3m/<slug>/hero.jpg")
 *                             OR an authored <img>/<picture>
 *   2. eyebrow (short label)  e.g. "Building & Construction"
 *   3. headline               -> rendered as the page <h1>
 *   4. lede paragraph
 *   5. CTAs                    <strong><a> primary, <em><a> secondary
 *
 * A root-relative path is built into an <img> client-side (browser-fetched,
 * not pipeline-ingested) so committed brand imagery never ships as about:error.
 * Mirrors the home hero-video overlay/scrim treatment with a still image.
 */
const IMG_PATH = /^\/[\w./-]+\.(jpg|jpeg|png|webp|avif)$/i;

export default function decorate(block) {
  block.closest('.section')?.classList.add('full');

  let picture = block.querySelector('picture, img');
  const cellsAll = [...block.querySelectorAll(':scope > div > div')];
  const pathCell = cellsAll.find((c) => IMG_PATH.test(c.textContent.trim()));
  if (!picture && pathCell) {
    const img = document.createElement('img');
    img.src = pathCell.textContent.trim();
    img.alt = '';
    img.loading = 'eager';
    pathCell.replaceChildren(img);
    picture = img;
  }
  const heading = block.querySelector('h1, h2, h3');
  const ctaCell = cellsAll.find((c) => c.querySelector('a'));
  // text cells that aren't the image, heading, or CTA — robust to <p>-wrapping:
  // shortest is the eyebrow, longest is the lede.
  const textCells = cellsAll
    .filter((c) => c !== pathCell
      && !c.querySelector('h1, h2, h3, img, picture')
      && c !== ctaCell
      && !c.querySelector('a')
      && c.textContent.trim())
    .sort((a, b) => a.textContent.trim().length - b.textContent.trim().length);
  const eyebrow = textCells.length > 1 ? textCells[0].textContent.trim() : '';
  const ledeCell = textCells.length > 1 ? textCells[textCells.length - 1] : textCells[0];

  const inner = document.createElement('div');
  inner.className = 'wrap';
  if (eyebrow) {
    const e = document.createElement('span');
    e.className = 'eyebrow';
    e.textContent = eyebrow;
    inner.append(e);
  }
  if (heading) {
    const h1 = document.createElement('h1');
    h1.append(...heading.childNodes);
    inner.append(h1);
  }
  const rule = document.createElement('div');
  rule.className = 'rule';
  inner.append(rule);
  if (ledeCell) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.textContent = ledeCell.textContent.trim();
    inner.append(p);
  }
  if (ctaCell) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    [...(ctaCell.querySelector('p') || ctaCell).childNodes].forEach((n) => actions.append(n.cloneNode(true)));
    inner.append(actions);
  }

  const bg = document.createElement('div');
  bg.className = 'hero-bg';
  if (picture) bg.append(picture.closest('picture') || picture);

  const scrim = document.createElement('div');
  scrim.className = 'hero-scrim';

  block.replaceChildren(bg, scrim, inner);
}
