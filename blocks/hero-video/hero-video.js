/**
 * hero-video — full-bleed looping brand video with headline overlay.
 *
 * Authoring (one cell per row, in order):
 *   1. eyebrow (short label)        e.g. "Science. Applied to Life."
 *   2. headline                     -> rendered as the page <h1>
 *   3. lede paragraph
 *   4. CTAs                         <strong><a> primary, <em><a> secondary
 *                                   (decorateButtons converts these before us)
 *
 * The hero video + poster are fixed brand assets (not authorable content),
 * committed to the repo and served root-relative (self-hosted, no CDN coupling).
 */

const VIDEO_SRC = '/img/3m/hero.mp4';
const POSTER_SRC = '/img/3m/microscope.jpg';

export default function decorate(block) {
  // full-bleed ground (replaces a Section Metadata "Style: full")
  block.closest('.section')?.classList.add('full');
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const heading = block.querySelector('h1, h2, h3');
  const ps = [...block.querySelectorAll('p')];
  const ctaP = ps.find((p) => p.querySelector('a'));
  // eyebrow = first cell with short text, no heading, no link
  const eyebrowCell = cells.find((c) => !c.querySelector('h1,h2,h3,a,picture,img') && c.textContent.trim());
  // `wrapTextNodes` in aem.js wraps every bare-text block column in a <p>, so the
  // eyebrow cell is always a lede candidate too. Exclude it, or it renders twice
  // and the real lede is dropped.
  const lede = ps.find((p) => p !== ctaP && !eyebrowCell?.contains(p) && p.textContent.trim());
  const eyebrow = eyebrowCell ? eyebrowCell.textContent.trim() : '';

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
  if (lede) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.append(...lede.childNodes);
    inner.append(p);
  }
  if (ctaP) {
    const actions = document.createElement('div');
    actions.className = 'actions';
    // Accept either all CTAs in one paragraph (legacy) or one per paragraph.
    // The latter is required for scripts.js decorateButtons() to buttonize them,
    // since it skips any link whose paragraph contains other text.
    ps.filter((p) => p.querySelector('a')).forEach((p) => {
      [...p.childNodes].forEach((n) => actions.append(n.cloneNode(true)));
    });
    // decorateButtons() only buttonizes a link whose paragraph holds nothing
    // else, so two CTAs authored in one paragraph stay bare. This block owns its
    // actions row, so apply the same <strong>/<em> contract here as a fallback.
    [...actions.querySelectorAll('a')].forEach((a) => {
      if (a.classList.contains('button')) return;
      const strong = a.closest('strong');
      const em = a.closest('em');
      if (!strong && !em) return;
      if (strong && em) a.className = 'button accent';
      else a.className = strong ? 'button primary' : 'button secondary';
      let outer = strong || em;
      if (strong && em) outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    });
    inner.append(actions);
  }

  const video = document.createElement('video');
  video.className = 'hero-video-bg';
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('poster', POSTER_SRC);
  video.setAttribute('aria-hidden', 'true');
  const src = document.createElement('source');
  src.src = VIDEO_SRC;
  src.type = 'video/mp4';
  video.append(src);

  const scrim = document.createElement('div');
  scrim.className = 'hero-video-scrim';

  block.replaceChildren(video, scrim, inner);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
  }
}
