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

// accept a committed root-relative path or a full http(s) URL (with query)
const VIDEO_PATH = /^(https?:\/\/\S+|\/[\w./-]+)\.(mp4|webm)(\?\S*)?$/i;
const IMG_PATH = /^(https?:\/\/\S+|\/[\w./-]+)\.(jpg|jpeg|png|webp|avif|svg)(\?\S*)?$/i;

function buildMedia(cell) {
  if (!cell) return null;
  const existing = cell.querySelector('video, picture, img');
  if (existing) return existing.closest('picture') || existing;

  const paths = cell.textContent.split(/\s+/).map((s) => s.trim()).filter(Boolean);
  const videoPath = paths.find((p) => VIDEO_PATH.test(p));
  const imgPath = paths.find((p) => IMG_PATH.test(p));
  if (videoPath) {
    const v = document.createElement('video');
    v.src = videoPath;
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    if (imgPath) v.poster = imgPath;
    return v;
  }
  if (imgPath) {
    const img = document.createElement('img');
    img.src = imgPath;
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

  // ---- controls ----
  const nav = document.createElement('div');
  nav.className = 'carousel-nav';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'carousel-arrow prev';
  prev.setAttribute('aria-label', 'Previous slide');
  prev.innerHTML = '‹';
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'carousel-arrow next';
  next.setAttribute('aria-label', 'Next slide');
  next.innerHTML = '›';

  const dots = document.createElement('div');
  dots.className = 'carousel-dots';
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = `carousel-dot${i === 0 ? ' is-active' : ''}`;
    d.setAttribute('aria-label', `Go to slide ${i + 1}`);
    // eslint-disable-next-line no-use-before-define
    d.onclick = () => goTo(i);
    dots.append(d);
  });

  block.append(prev, next, nav);
  nav.append(dots);

  let current = 0;
  let timer = null;

  function playActive() {
    slides.forEach((s, i) => {
      const v = s.querySelector('video');
      if (!v) return;
      if (i === current) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause();
    });
  }

  function goTo(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => s.classList.toggle('is-active', n === current));
    [...dots.children].forEach((d, n) => d.classList.toggle('is-active', n === current));
    playActive();
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  function start() {
    stop();
    if (!reduce && interval > 0) timer = setInterval(() => goTo(current + 1), interval);
  }

  prev.onclick = () => { goTo(current - 1); start(); };
  next.onclick = () => { goTo(current + 1); start(); };
  block.addEventListener('mouseenter', stop);
  block.addEventListener('mouseleave', start);
  block.addEventListener('focusin', stop);
  block.addEventListener('focusout', start);
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { goTo(current - 1); start(); }
    if (e.key === 'ArrowRight') { goTo(current + 1); start(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(); else start();
  });

  playActive();
  start();
}
