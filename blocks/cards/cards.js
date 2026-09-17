/**
 * cards — responsive grid of content cards. Variants via block class:
 *   cards duo | cards features | cards icons | cards links | cards products | cards testimonial
 *
 * Authoring (one row per card; cells in order, all optional):
 *   1. media             an authored <img>/<picture>, OR a root-relative path
 *                        text ("/img/3m/<slug>/card.jpg") that is built into an
 *                        <img> client-side so committed brand imagery survives
 *   2. title             heading or plain text
 *   3. description       paragraph(s) and/or bullet list — rich content preserved
 *   4. link              <a> — whole card links here (else first <a> found)
 *
 * Section head (eyebrow/heading/lede) is authored as default content above
 * the block; this block leaves it untouched.
 */
const IMG_PATH = /^\/[\w./-]+\.(jpg|jpeg|png|webp|avif|svg)$/i;

export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    let picture = row.querySelector('picture, img');
    const cells = [...row.children];
    // committed brand image authored as a root-relative path in its own cell
    const pathCell = cells.find((c) => IMG_PATH.test(c.textContent.trim()));
    if (!picture && pathCell) {
      const img = document.createElement('img');
      img.src = pathCell.textContent.trim();
      img.alt = '';
      img.loading = 'lazy';
      pathCell.replaceChildren(img);
      picture = img;
    }
    const link = row.querySelector('a');
    const heading = row.querySelector('h1, h2, h3, h4');

    const card = document.createElement(link ? 'a' : 'div');
    card.className = 'card';
    if (link) card.href = link.getAttribute('href');

    if (picture) {
      const media = document.createElement('div');
      media.className = 'card-media';
      media.append(picture.closest('picture') || picture);
      card.append(media);
    }

    const body = document.createElement('div');
    body.className = 'card-body';

    const title = heading ? heading.textContent.trim()
      : (cells.find((c) => c !== pathCell && !c.querySelector('img, picture, a') && c.textContent.trim())?.textContent.trim() || (link ? link.textContent.trim() : ''));
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      body.append(h);
    }

    // description cell: preserve rich content (paragraphs + bullet lists)
    const descCell = cells.find((c) => {
      const t = c.textContent.trim();
      return c !== pathCell && t && t !== title
        && !c.querySelector('img, picture, a, h1, h2, h3, h4');
    });
    if (descCell) {
      const rich = descCell.querySelector('p, ul, ol');
      if (rich) {
        [...descCell.childNodes].forEach((n) => body.append(n.cloneNode(true)));
      } else {
        const p = document.createElement('p');
        p.textContent = descCell.textContent.trim();
        body.append(p);
      }
    }

    if (link) {
      const arrow = document.createElement('span');
      arrow.className = 'card-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.innerHTML = '&rsaquo;';
      body.append(arrow);
    }

    card.append(body);
    li.append(card);
    ul.append(li);
  });

  block.replaceChildren(ul);
}
