/*
 * carousel — full-bleed video/image hero slider.
 *
 * Authoring (one row per slide; cells in order, all optional):
 *   1. media       an authored <video>/<img>/<picture>, OR root-relative path
 *                  text: "/media/hero.mp4" (built into a muted autoplay loop)
 *                  or "/img/hero.jpg". A poster image path may share the cell.
 *   2. eyebrow     small kicker line above the heading
 *   3. heading     the big headline (a heading element or plain text)
 *   4. text        supporting copy
 *   5. cta         one or more <a> — rendered as buttons
 *
 * Block config (a row with two cells, key/value) is also honored:
 *   interval  seconds between auto-advances (default 6; 0 disables autoplay)
 */

// match a video/image anywhere in a URL, tolerating query strings and the
// relative "./media_xxx.mp4" form DA emits for uploaded assets
const IS_VIDEO = /\.(mp4|webm|m4v|mov)(\?|$)/i;
const IS_IMG = /\.(jpg|jpeg|png|webp|avif|svg)(\?|$)/i;

function makeVideo(src, poster) {
  const v = document.createElement('video');
  v.src = src;
  v.muted = true;
  v.loop = true;
  v.autoplay = true;
  v.playsInline = true;
  v.setAttribute('playsinline', '');
  if (poster) v.poster = poster;
  return v;
}

function buildMedia(cell) {
  if (!cell) return null;
  // an already-authored <video> wins outright
  const video = cell.querySelector('video');
  if (video) return video;

  // collect every candidate URL: links, img/source, and bare text tokens
  const urls = [];
  cell.querySelectorAll('a[href]').forEach((a) => urls.push(a.getAttribute('href')));
  cell.querySelectorAll('img[src]').forEach((i) => urls.push(i.getAttribute('src')));
  cell.querySelectorAll('source[srcset]').forEach((s) => urls.push(s.getAttribute('srcset')));
  cell.textContent.split(/\s+/).forEach((tk) => { if (tk.trim()) urls.push(tk.trim()); });

  const videoUrl = urls.find((u) => IS_VIDEO.test(u));
  const imgUrl = urls.find((u) => IS_IMG.test(u));
  if (videoUrl) return makeVideo(videoUrl, imgUrl);

  // no video: prefer an authored <picture>/<img>, else build one from a path
  const pic = cell.querySelector('picture, img');
  if (pic) return pic.closest('picture') || pic;
  if (imgUrl) {
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }
  return null;
}

export default function decorate(block) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let interval = 6000;

  const slidesData = [];
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    // key/value config row (e.g. interval | 8)
    if (cells.length === 2 && /^\d+$/.test(cells[1].textContent.trim())
      && cells[0].textContent.trim().toLowerCase() === 'interval') {
      interval = Number(cells[1].textContent.trim()) * 1000;
      return;
    }
    slidesData.push(cells);
  });

  block.textContent = '';
  block.classList.add('carousel');
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  const track = document.createElement('div');
  track.className = 'carousel-track';

  slidesData.forEach((cells, i) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} of ${slidesData.length}`);
    if (i === 0) slide.classList.add('is-active');

    const media = buildMedia(cells[0]);
    if (media) {
      const m = document.createElement('div');
      m.className = 'carousel-media';
      m.append(media);
      slide.append(m);
    }
    const scrim = document.createElement('div');
    scrim.className = 'carousel-scrim';
    slide.append(scrim);

    const content = document.createElement('div');
    content.className = 'carousel-content';
    const [, eyebrowCell, headingCell, textCell, ctaCell] = cells;
    const eyebrow = eyebrowCell && eyebrowCell.textContent.trim();
    if (eyebrow) {
      const e = document.createElement('p');
      e.className = 'carousel-eyebrow';
      e.textContent = eyebrow;
      content.append(e);
    }
    const headingEl = headingCell && (headingCell.querySelector('h1,h2,h3,h4') || headingCell);
    const heading = headingEl && headingEl.textContent.trim();
    if (heading) {
      const h = document.createElement('h2');
      h.className = 'carousel-heading';
      h.textContent = heading;
      content.append(h);
    }
    const text = textCell && textCell.textContent.trim();
    if (text) {
      const p = document.createElement('p');
      p.className = 'carousel-text';
      p.textContent = text;
      content.append(p);
    }
    const links = ctaCell ? [...ctaCell.querySelectorAll('a')] : [];
    if (links.length) {
      const actions = document.createElement('div');
      actions.className = 'carousel-actions';
      links.forEach((a, j) => {
        a.className = `button${j === 0 ? '' : ' secondary'}`;
        actions.append(a);
      });
      content.append(actions);
    }
    slide.append(content);
    track.append(slide);
  });
  block.append(track);

  const slides = [...track.children];
  if (slides.length <= 1) return;

  // ---- controls: bottom-left indicators ----
  // active slide = a play-duration bar with a leading dot; others = dots.
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';
  const indicators = slides.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `carousel-indicator${i === 0 ? ' is-active' : ''}`;
    b.setAttribute('aria-label', `Go to slide ${i + 1}`);
    const fill = document.createElement('span');
    fill.className = 'carousel-fill';
    b.append(fill);
    // eslint-disable-next-line no-use-before-define
    b.onclick = () => { goTo(i); };
    nav.append(b);
    return b;
  });
  block.append(nav);

  let current = 0;
  let paused = false;

  function playActive() {
    slides.forEach((s, i) => {
      const v = s.querySelector('video');
      if (!v) return;
      if (i === current) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
    });
  }

  // restart the fill animation on the active indicator (duration = interval)
  function restartFill() {
    const fill = indicators[current].querySelector('.carousel-fill');
    fill.style.animation = 'none';
    if (reduce || interval <= 0) return;
    // force reflow so the animation restarts from 0
    fill.getBoundingClientRect();
    fill.style.animation = `carousel-fill ${interval}ms linear forwards`;
    fill.style.animationPlayState = paused ? 'paused' : 'running';
  }

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === current));
    indicators.forEach((b, n) => b.classList.toggle('is-active', n === current));
    playActive();
    restartFill();
  }

  // auto-advance is driven by the fill animation finishing (keeps bar in sync)
  indicators.forEach((b) => {
    b.querySelector('.carousel-fill').addEventListener('animationend', () => {
      if (!paused) goTo(current + 1);
    });
  });

  function setPaused(p) {
    paused = p;
    const fill = indicators[current].querySelector('.carousel-fill');
    if (fill.style.animationName === 'carousel-fill' || fill.style.animation.includes('carousel-fill')) {
      fill.style.animationPlayState = p ? 'paused' : 'running';
    }
  }

  block.addEventListener('mouseenter', () => setPaused(true));
  block.addEventListener('mouseleave', () => setPaused(false));
  block.addEventListener('focusin', () => setPaused(true));
  block.addEventListener('focusout', () => setPaused(false));
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(current - 1);
    if (e.key === 'ArrowRight') goTo(current + 1);
  });
  document.addEventListener('visibilitychange', () => setPaused(document.hidden));

  playActive();
  restartFill();
}
