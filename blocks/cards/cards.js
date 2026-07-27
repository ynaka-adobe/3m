/**
 * cards — responsive grid of content cards. Variants via block class:
 *   cards applications | cards products | cards values | cards links
 *
 * Authoring (one row per card; cells in order, all optional):
 *   1. <img>/<picture>   card media (authored DA-media image)
 *   2. title             heading or plain text
 *   3. description       paragraph
 *   4. link              <a> — whole card links here (else first <a> found)
 *
 * Section head (eyebrow/heading/lede) is authored as default content above
 * the block; this block leaves it untouched.
 */
export default function decorate(block) {
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    const picture = row.querySelector('picture, img');
    const link = row.querySelector('a');
    const heading = row.querySelector('h1, h2, h3, h4');
    const cells = [...row.children];

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
      : (cells.find((c) => !c.querySelector('img, picture, a') && c.textContent.trim())?.textContent.trim() || (link ? link.textContent.trim() : ''));
    if (title) {
      const h = document.createElement('h3');
      h.textContent = title;
      body.append(h);
    }

    const descCell = cells.find((c) => {
      const t = c.textContent.trim();
      return t && t !== title && !c.querySelector('img, picture, a, h1, h2, h3, h4');
    });
    if (descCell) {
      const p = document.createElement('p');
      p.textContent = descCell.textContent.trim();
      body.append(p);
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
