/**
 * news — "What's new": one large lead story + a stack of supporting stories.
 *
 * Authoring (one row per story, in order; first row = lead):
 *   cell 1: date          e.g. "June 25, 2026"
 *   cell 2: headline
 *   cell 3: description   (optional; shown on the lead only)
 *
 * Story imagery is fixed brand media (3M newsroom), committed root-relative and
 * paired by row order. The section title ("What's new") is authored as default
 * content in the section, above this block.
 */

const IMGS = [
  { src: '/img/3m/fiber-optic.jpg', alt: '3M fiber optic technology inside a modern data center' },
  { src: '/img/3m/skillsusa.jpg', alt: 'Students at the SkillsUSA national conference' },
  { src: '/img/3m/skills-comp.jpg', alt: 'A skilled-trades competitor at work' },
  { src: '/img/3m/ind-automotive.jpg', alt: 'A robotic arm finishing an automotive surface with 3M abrasives' },
];

function media(img) {
  const wrap = document.createElement('div');
  wrap.className = 'news-img';
  const el = document.createElement('img');
  el.src = img.src;
  el.alt = img.alt;
  el.loading = 'lazy';
  wrap.append(el);
  return wrap;
}

export default function decorate(block) {
  // light ground band (replaces a Section Metadata "Style: light")
  block.closest('.section')?.classList.add('light');
  const rows = [...block.children];
  const stories = rows.map((row) => {
    const cells = [...row.children];
    return {
      date: cells[0] ? cells[0].textContent.trim() : '',
      headline: cells[1] ? cells[1].textContent.trim() : '',
      desc: cells[2] ? cells[2].textContent.trim() : '',
    };
  }).filter((s) => s.headline);

  const layout = document.createElement('div');
  layout.className = 'news-layout';

  const [lead, ...rest] = stories;

  if (lead) {
    const a = document.createElement('a');
    a.className = 'news-lead';
    a.href = '#';
    a.append(media(IMGS[0]));
    const body = document.createElement('div');
    body.className = 'news-body';
    body.innerHTML = `<span class="news-date">${lead.date}</span><h3>${lead.headline}</h3>${lead.desc ? `<p>${lead.desc}</p>` : ''}`;
    a.append(body);
    layout.append(a);
  }

  const stack = document.createElement('div');
  stack.className = 'news-stack';
  rest.slice(0, 3).forEach((s, i) => {
    const a = document.createElement('a');
    a.className = 'news-item';
    a.href = '#';
    a.append(media(IMGS[i + 1] || IMGS[0]));
    const body = document.createElement('div');
    body.className = 'news-body';
    body.innerHTML = `<span class="news-date">${s.date}</span><h3>${s.headline}</h3>`;
    a.append(body);
    stack.append(a);
  });
  layout.append(stack);

  block.replaceChildren(layout);
}
