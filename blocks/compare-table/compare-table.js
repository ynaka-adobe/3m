/**
 * compare-table (rMDS-218) — feature comparison grid (e.g. Good / Better /
 * Best). Boolean cells authored as yes/no (or ✓/✗/x/-) render as icons with an
 * accessible text equivalent, so the table still reads correctly to a screen
 * reader. On narrow viewports the table reflows into one card per column.
 *
 * Variants via block class:
 *   compare-table compact   tighter row height
 *
 * Authoring:
 *   row 1        header — 1. (blank or row-label heading)
 *                         2..n column names. Mark the recommended column by
 *                         bolding its name (<strong>) — it gets the highlight
 *                         treatment and a "Recommended" flag.
 *   rows 2..n    1. feature name
 *                2..n cell value — "yes"/"no" for a tick/cross, or any text
 */
const YES = /^(yes|y|true|✓|✔|check)$/i;
const NO = /^(no|n|false|✗|✘|x|-|–|—)$/i;

const ICON_YES = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6.2 12.3 2.4 8.5l1.1-1.1 2.7 2.7 6.3-6.3 1.1 1.1-7.4 7.4Z"/></svg>';
const ICON_NO = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M12.7 4.4 11.6 3.3 8 6.9 4.4 3.3 3.3 4.4 6.9 8l-3.6 3.6 1.1 1.1L8 9.1l3.6 3.6 1.1-1.1L9.1 8l3.6-3.6Z"/></svg>';

function boolCell(td, value) {
  const yes = YES.test(value);
  const icon = document.createElement('span');
  icon.className = `ct-bool is-${yes ? 'yes' : 'no'}`;
  icon.innerHTML = yes ? ICON_YES : ICON_NO;
  const sr = document.createElement('span');
  sr.className = 'ct-sr';
  sr.textContent = yes ? 'Included' : 'Not included';
  td.replaceChildren(icon, sr);
}

export default function decorate(block) {
  const rows = [...block.children];
  if (!rows.length) return;

  const headRow = rows[0];
  const headCells = [...headRow.children];
  const colNames = headCells.slice(1).map((c) => c.textContent.trim());
  const highlightIdx = headCells.slice(1).findIndex((c) => c.querySelector('strong, b'));

  const table = document.createElement('table');
  table.className = 'ct-table';

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');

  const corner = document.createElement('th');
  corner.scope = 'col';
  corner.className = 'ct-corner';
  corner.textContent = headCells[0] ? headCells[0].textContent.trim() : '';
  tr.append(corner);

  colNames.forEach((name, i) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.className = 'ct-col';
    if (i === highlightIdx) th.classList.add('is-highlight');

    const label = document.createElement('span');
    label.className = 'ct-col-name';
    label.textContent = name;
    th.append(label);

    if (i === highlightIdx) {
      const flag = document.createElement('span');
      flag.className = 'ct-flag';
      flag.textContent = 'Recommended';
      th.append(flag);
    }
    tr.append(th);
  });
  thead.append(tr);
  table.append(thead);

  const tbody = document.createElement('tbody');
  rows.slice(1).forEach((row) => {
    const cells = [...row.children];
    if (!cells.length) return;
    const bodyTr = document.createElement('tr');

    const th = document.createElement('th');
    th.scope = 'row';
    th.className = 'ct-feature';
    th.append(...cells[0].childNodes);
    bodyTr.append(th);

    colNames.forEach((name, i) => {
      const cell = cells[i + 1];
      const td = document.createElement('td');
      td.className = 'ct-cell';
      if (i === highlightIdx) td.classList.add('is-highlight');
      td.setAttribute('data-label', name);

      const value = cell ? cell.textContent.trim() : '';
      if (YES.test(value) || NO.test(value)) {
        boolCell(td, value);
      } else if (cell) {
        td.append(...cell.childNodes);
      }
      bodyTr.append(td);
    });
    tbody.append(bodyTr);
  });

  table.append(tbody);

  const scroll = document.createElement('div');
  scroll.className = 'ct-scroll';
  scroll.append(table);
  block.replaceChildren(scroll);
}
