/**
 * who-we-are — closing band on black: a large statement headline + a column of
 * destination links (About / Careers / Investors / ...).
 *
 * Authoring:
 *   row 1: heading (use <em> to accent a word, e.g. "<em>Reimagining</em>")
 *   rows 2..n: one link per row (plain <a> — these are destinations, not buttons)
 * The section is set to the black ground via a Section Metadata "Style: black".
 */

export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    section.id = 'who';
    section.classList.add('black'); // black ground (replaces a Section Metadata "Style: black")
  }
  const rows = [...block.children];
  const headingCell = rows[0] ? rows[0].querySelector('h1, h2, h3') || rows[0] : null;

  const wrap = document.createElement('div');
  wrap.className = 'who-inner';

  const h = document.createElement('h2');
  if (headingCell) h.append(...headingCell.childNodes);
  wrap.append(h);

  const links = document.createElement('div');
  links.className = 'who-links';
  rows.slice(1).forEach((row) => {
    const a = row.querySelector('a');
    const label = (a ? a.textContent : row.textContent).trim();
    if (!label) return;
    const item = document.createElement('a');
    item.href = a ? a.getAttribute('href') : '#';
    item.innerHTML = `${label} <span aria-hidden="true">&rsaquo;</span>`;
    links.append(item);
  });
  wrap.append(links);

  block.replaceChildren(wrap);
}
