/**
 * contact-cta — "We're here to help" support band: heading, supporting copy
 * (may include a phone number), and a CTA button. Sits on the light ground.
 *
 * Authoring (one cell per row):
 *   1. heading
 *   2. body copy (a <strong> or <a tel:> phone is preserved)
 *   3. CTA          <strong><a> primary
 */
export default function decorate(block) {
  block.closest('.section')?.classList.add('light');

  const rows = [...block.children];
  const heading = block.querySelector('h1, h2, h3');
  const ps = [...block.querySelectorAll('p')];
  const ctaP = ps.find((p) => p.querySelector('a:not([href^="tel:"])'));
  const body = ps.find((p) => p !== ctaP && p.textContent.trim());

  const wrap = document.createElement('div');
  wrap.className = 'cc-inner';

  const text = document.createElement('div');
  text.className = 'cc-text';
  if (heading) {
    const h = document.createElement('h2');
    h.append(...heading.childNodes);
    text.append(h);
  } else if (rows[0]) {
    const h = document.createElement('h2');
    h.textContent = rows[0].textContent.trim();
    text.append(h);
  }
  if (body) {
    const p = document.createElement('p');
    p.append(...body.childNodes);
    text.append(p);
  }
  wrap.append(text);

  if (ctaP) {
    const actions = document.createElement('div');
    actions.className = 'cc-actions';
    [...ctaP.childNodes].forEach((n) => actions.append(n.cloneNode(true)));
    wrap.append(actions);
  }

  block.replaceChildren(wrap);
}
