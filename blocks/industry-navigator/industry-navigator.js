/**
 * industry-navigator — "What we do": a left rail of industries + a panel that
 * shows the selected industry's image, title, description and sub-links.
 * (Mirrors the live 3M.com industry tab navigator.)
 *
 * Authoring (one row per industry, in order):
 *   cell 1: tab label        e.g. "Design & Construction"
 *   cell 2: title
 *   cell 3: description
 *   cell 4: sub-links        comma-separated labels
 *
 * Each industry's image is fixed brand media, paired by a slug of the tab label
 * (committed root-relative). The section title ("What we do") is authored as
 * default content above this block.
 */

const IMG_BY_SLUG = {
  automotive: 'ind-automotive',
  'commercial-solutions': 'ind-commercial',
  consumer: 'ind-consumer',
  'design-construction': 'ind-design',
  electronics: 'ind-electronics',
  energy: 'ind-energy',
  government: 'ind-government',
  manufacturing: 'ind-manufacturing',
  safety: 'ind-safety',
  transportation: 'ind-transport',
};

function slug(s) {
  return s.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function decorate(block) {
  const section = block.closest('.section');
  if (section) section.id = 'industries';
  const industries = [...block.children].map((row) => {
    const cells = [...row.children];
    const tab = cells[0] ? cells[0].textContent.trim() : '';
    const links = cells[3]
      ? cells[3].textContent.split(',').map((l) => l.trim()).filter(Boolean)
      : [];
    return {
      tab,
      slug: slug(tab),
      title: cells[1] ? cells[1].textContent.trim() : '',
      desc: cells[2] ? cells[2].textContent.trim() : '',
      links,
    };
  }).filter((d) => d.tab);

  const navi = document.createElement('div');
  navi.className = 'navi';

  const tabs = document.createElement('div');
  tabs.className = 'navi-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', 'Industries');

  const panel = document.createElement('div');
  panel.className = 'navi-panel';
  panel.innerHTML = '<div class="navi-img"><img src="/img/3m/ind-design.jpg" alt="" loading="lazy"></div>'
    + '<div class="navi-pbody"><h3></h3><p></p><div class="navi-links"></div></div>';
  const imgEl = panel.querySelector('img');
  const titleEl = panel.querySelector('h3');
  const descEl = panel.querySelector('p');
  const linksEl = panel.querySelector('.navi-links');

  function paint(d) {
    const file = IMG_BY_SLUG[d.slug] || 'ind-manufacturing';
    imgEl.src = `/img/3m/${file}.jpg`;
    imgEl.alt = d.tab;
    titleEl.textContent = d.title;
    descEl.textContent = d.desc;
    linksEl.innerHTML = d.links.map((l) => `<a href="#">${l}</a>`).join('');
    tabs.querySelectorAll('.navi-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.slug === d.slug)));
  }

  industries.forEach((d) => {
    const b = document.createElement('button');
    b.className = 'navi-tab';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.dataset.slug = d.slug;
    b.textContent = d.tab;
    b.addEventListener('click', () => paint(d));
    b.addEventListener('mouseenter', () => paint(d));
    tabs.append(b);
  });

  navi.append(tabs, panel);
  block.replaceChildren(navi);

  const initial = industries.find((d) => d.slug === 'design-construction') || industries[0];
  if (initial) paint(initial);
}
