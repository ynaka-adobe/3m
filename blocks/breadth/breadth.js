/**
 * breadth — product-category index on a dark band ("One catalog, a world of
 * capability."). Shows the portfolio breadth as a multi-column link index.
 *
 * Authoring:
 *   row 1: heading text
 *   row 2: a bulleted list (<ul>) of product categories
 * The section is set to the ink ground via a Section Metadata "Style: ink".
 */

export default function decorate(block) {
  const section = block.closest('.section');
  if (section) {
    section.id = 'breadth';
    section.classList.add('ink'); // ink ground (replaces a Section Metadata "Style: ink")
  }
  const headingEl = block.querySelector('h1, h2, h3') || block.querySelector(':scope > div > div');
  const headingText = headingEl ? headingEl.textContent.trim() : '';
  const items = [...block.querySelectorAll('li')].map((li) => li.textContent.trim()).filter(Boolean);

  const wrap = document.createElement('div');
  wrap.className = 'breadth-inner';

  const h = document.createElement('h2');
  h.className = 'breadth-head';
  h.textContent = headingText;
  wrap.append(h);

  if (items.length) {
    const cols = document.createElement('div');
    cols.className = 'breadth-cols';
    items.forEach((label) => {
      const a = document.createElement('a');
      a.href = '#';
      a.textContent = label;
      cols.append(a);
    });
    wrap.append(cols);
  }

  block.replaceChildren(wrap);
}
