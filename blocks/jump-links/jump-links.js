/**
 * jump-links — MDS "On this page" bar: a label and a row of in-page anchor
 * links to the page's sections.
 *
 * Authoring (one row):
 *   cell 1   label, e.g. "On this page"
 *   cell 2   list (or paragraphs) of links to #heading-ids on the page
 */
export default function decorate(block) {
  const cells = [...block.querySelectorAll(':scope > div > div')];
  const labelCell = cells.find((c) => !c.querySelector('a'));
  const links = [...block.querySelectorAll('a')];

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', labelCell?.textContent.trim() || 'On this page');

  if (labelCell) {
    const label = document.createElement('p');
    label.className = 'jump-links-label';
    label.textContent = labelCell.textContent.trim();
    nav.append(label);
  }

  const ul = document.createElement('ul');
  links.forEach((a) => {
    const li = document.createElement('li');
    a.className = '';
    a.removeAttribute('title');
    li.append(a);
    ul.append(li);
  });
  nav.append(ul);

  block.replaceChildren(nav);
}
