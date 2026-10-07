/**
 * product-selector — entry point into the product finder. Renders a short
 * pitch plus optional narrowing dropdowns; the choices are appended to the
 * destination URL as query parameters, so the finder page receives a
 * pre-filtered request. With no dropdowns authored it degrades to a plain CTA
 * band, which is how most pages use it.
 *
 * Variants via block class:
 *   product-selector light | ink    ground treatment
 *   product-selector inline         pitch and controls on one row
 *
 * Authoring:
 *   row 1            heading (heading element or plain text)
 *   row 2            supporting copy (optional)
 *   "select" rows    1. the literal "select"
 *                    2. label      e.g. "Industry"
 *                    3. options    comma-separated, e.g. "Automotive, Marine"
 *                    4. parameter  query key, e.g. "industry" (defaults to a
 *                                  slug of the label)
 *   final row        the CTA <a> — its href is the destination
 */
function slug(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildSelect(spec, i) {
  const field = document.createElement('div');
  field.className = 'ps-field';

  const id = `ps-${slug(spec.label) || i}`;
  const label = document.createElement('label');
  label.className = 'ps-label';
  label.setAttribute('for', id);
  label.textContent = spec.label;

  const select = document.createElement('select');
  select.className = 'ps-select';
  select.id = id;
  select.name = spec.param;

  const any = document.createElement('option');
  any.value = '';
  any.textContent = 'All';
  select.append(any);

  spec.options.forEach((opt) => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    select.append(option);
  });

  field.append(label, select);
  return { field, select };
}

export default function decorate(block) {
  const rows = [...block.children];
  const specs = [];
  const consumed = new Set();

  rows.forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    if (cells[0].textContent.trim().toLowerCase() !== 'select') return;
    const label = cells[1]?.textContent.trim();
    const options = (cells[2]?.textContent || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!label || !options.length) return;
    specs.push({ label, options, param: cells[3]?.textContent.trim() || slug(label) });
    consumed.add(row);
  });

  const cta = block.querySelector('a');
  const ctaRow = cta ? rows.find((r) => r.contains(cta)) : null;
  const textRows = rows.filter((r) => !consumed.has(r) && r !== ctaRow && r.textContent.trim());

  const wrap = document.createElement('div');
  wrap.className = 'ps-inner';

  const text = document.createElement('div');
  text.className = 'ps-text';

  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const h = document.createElement('h2');
    h.append(...heading.childNodes);
    text.append(h);
  } else if (textRows[0]) {
    const h = document.createElement('h2');
    h.textContent = textRows[0].textContent.trim();
    text.append(h);
  }

  const bodyRow = textRows.find((r) => !heading || !r.contains(heading));
  if (bodyRow && (!heading || !bodyRow.contains(heading))) {
    const p = document.createElement('p');
    p.textContent = bodyRow.textContent.trim();
    if (p.textContent && p.textContent !== text.querySelector('h2')?.textContent) {
      text.append(p);
    }
  }
  wrap.append(text);

  const controls = document.createElement('div');
  controls.className = 'ps-controls';
  const selects = [];

  specs.forEach((spec, i) => {
    const { field, select } = buildSelect(spec, i);
    selects.push(select);
    controls.append(field);
  });

  if (cta) {
    cta.classList.add('button', 'primary', 'ps-cta');
    const base = cta.getAttribute('href') || '#';
    const apply = () => {
      let url;
      try {
        url = new URL(base, window.location.origin);
      } catch (e) {
        return;
      }
      selects.forEach((s) => {
        if (s.value) url.searchParams.set(s.name, s.value);
        else url.searchParams.delete(s.name);
      });
      cta.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
    };
    selects.forEach((s) => s.addEventListener('change', apply));
    if (selects.length) apply();
    controls.append(cta);
  }

  if (controls.children.length) wrap.append(controls);
  block.replaceChildren(wrap);

  if (block.classList.contains('light')) block.closest('.section')?.classList.add('light');
  if (block.classList.contains('ink')) block.closest('.section')?.classList.add('ink');
}
