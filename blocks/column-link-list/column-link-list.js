/**
 * column-link-list (rMDS-203) — multi-column list of links, used for "products
 * by type / by brand" style navigation. Link affordance is derived from the
 * href so authors only ever paste a link:
 *   • document (.pdf, .doc, .xls, .ppt, .zip) → leading document icon
 *   • off-site (different origin)             → trailing external icon
 *   • everything else                         → plain link
 *
 * Variants via block class:
 *   column-link-list two | four   column count (default three)
 *   column-link-list rule         hairline rule between columns
 *
 * Authoring (one row per column):
 *   1. heading    column title (heading element or plain text)
 *   2. links      a bullet list of links (<ul><li><a>…) — order preserved
 */
const DOC_EXT = /\.(pdf|docx?|xlsx?|pptx?|zip)(\?|$)/i;

const ICON_DOC = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M9.5 1H3.5v14h9V4.5L9.5 1Zm0 1.4 2.1 2.1H9.5V2.4ZM4.5 14V2h4v3.5H11.5V14h-7Z"/><path d="M5.8 7.5h4.4v1H5.8zM5.8 9.8h4.4v1H5.8z"/></svg>';
const ICON_EXT = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M6 2v1H3.6v9.4H13V10h1v4H2.6V2H6Z"/><path d="M9 2h5v5h-1V3.7L7.8 8.9l-.7-.7L12.3 3H9V2Z"/></svg>';

function linkKind(a) {
  const href = a.getAttribute('href') || '';
  if (DOC_EXT.test(href)) return 'doc';
  if (/^https?:\/\//i.test(href)) {
    try {
      if (new URL(href, window.location.origin).origin !== window.location.origin) return 'external';
    } catch (e) {
      return 'external';
    }
  }
  return 'plain';
}

function decorateLink(a) {
  const kind = linkKind(a);
  a.classList.add('cll-link', `is-${kind}`);
  if (kind === 'doc') {
    const icon = document.createElement('span');
    icon.className = 'cll-icon cll-icon-lead';
    icon.innerHTML = ICON_DOC;
    a.prepend(icon);
  } else if (kind === 'external') {
    const icon = document.createElement('span');
    icon.className = 'cll-icon cll-icon-trail';
    icon.innerHTML = ICON_EXT;
    a.append(icon);
    if (!a.hasAttribute('rel')) a.setAttribute('rel', 'noopener');
  }
}

export default function decorate(block) {
  const cols = document.createElement('div');
  cols.className = 'cll-columns';

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const col = document.createElement('div');
    col.className = 'cll-column';

    const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
    const list = row.querySelector('ul, ol');

    if (heading) {
      const h = document.createElement('h3');
      h.append(...heading.childNodes);
      col.append(h);
    } else if (cells.length > 1 && cells[0].textContent.trim()) {
      const h = document.createElement('h3');
      h.textContent = cells[0].textContent.trim();
      col.append(h);
    }

    const ul = document.createElement('ul');
    const anchors = list ? [...list.querySelectorAll('a')] : [...row.querySelectorAll('a')];
    anchors.forEach((a) => {
      const li = document.createElement('li');
      decorateLink(a);
      li.append(a);
      ul.append(li);
    });
    if (ul.children.length) col.append(ul);

    cols.append(col);
  });

  block.replaceChildren(cols);
}
