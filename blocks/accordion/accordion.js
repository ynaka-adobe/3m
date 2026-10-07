/*
 * Accordion Block
 * Recreate an accordion
 * https://www.hlx.live/developer/block-collection/accordion
 *
 * Built on native <details>, so it stays keyboard operable, screen-reader
 * announced, and findable by in-page browser search before any JS runs.
 *
 * Variants via block class:
 *   accordion single    only one item open at a time
 *   accordion open      first item starts expanded
 *
 * Items deep-link: /page#faq-<question-slug> opens and scrolls to that item.
 */
const MAX_ID = 48;

function slug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// trim to a whole word so deep-link URLs stay readable
function shortSlug(text) {
  const full = slug(text);
  if (full.length <= MAX_ID) return full;
  const cut = full.slice(0, MAX_ID);
  const lastDash = cut.lastIndexOf('-');
  return (lastDash > 12 ? cut.slice(0, lastDash) : cut).replace(/-$/, '');
}

export default function decorate(block) {
  const single = block.classList.contains('single');
  const startOpen = block.classList.contains('open');

  [...block.children].forEach((row, i) => {
    // decorate accordion item label
    const label = row.children[0];
    if (!label) return;
    const summary = document.createElement('summary');
    summary.className = 'accordion-item-label';
    summary.append(...label.childNodes);
    // decorate accordion item body
    const body = row.children[1];
    if (body) body.className = 'accordion-item-body';
    // decorate accordion item
    const details = document.createElement('details');
    details.className = 'accordion-item';
    const title = summary.textContent.trim();
    if (title) details.id = `faq-${shortSlug(title) || i}`;
    if (startOpen && i === 0) details.open = true;
    details.append(summary);
    if (body) details.append(body);
    row.replaceWith(details);
  });

  if (single) {
    block.addEventListener('toggle', (e) => {
      const opened = e.target;
      if (!opened.open) return;
      block.querySelectorAll('details.accordion-item[open]').forEach((d) => {
        if (d !== opened) d.open = false;
      });
    }, true);
  }

  // deep link: /page#faq-how-do-i... opens and scrolls to that item
  const id = window.location.hash.slice(1);
  if (id) {
    const target = block.querySelector(`#${CSS.escape(id)}`);
    if (target) {
      target.open = true;
      target.scrollIntoView({ block: 'center' });
    }
  }
}
