/* eslint-disable */
/* global WebImporter */

/**
 * tabs-industry v10.
 * Tabs block: 2 columns, multiple rows. Col 1: tab label. Col 2: tab content.
 * Source DOM: #js-homepageVtabs with .MMM--relatedItems-tabs-list for labels,
 * .relatedItems-tabs-content-panel for content panels.
 */
export default function parse(element, { document }) {
  // Get tab labels from the tab navigation list
  const tabLabels = element.querySelectorAll('.MMM--relatedItems-tabs-list a, .MMM--relatedItems-tabs-list button');
  // Get tab panels with content
  const tabPanels = element.querySelectorAll('.relatedItems-tabs-content-panel');

  const cells = [];

  tabPanels.forEach((panel, i) => {
    // Get label text
    const labelEl = tabLabels[i];
    const labelText = labelEl ? labelEl.textContent.trim() : `Tab ${i + 1}`;

    // Build label cell
    const label = document.createElement('p');
    label.textContent = labelText;

    // Build content cell from panel
    const contentCell = [];

    // Get image
    const img = panel.querySelector('.relatedCategory-bd > img, .relatedCategory-bd img');
    if (img) {
      const newImg = document.createElement('img');
      newImg.src = img.src;
      newImg.alt = img.alt || '';
      contentCell.push(newImg);
    }

    // Get heading
    const heading = panel.querySelector('.js-vtabsContent h3, .mds-font_header--4');
    if (heading) {
      const h = document.createElement('h3');
      h.textContent = heading.textContent.trim();
      contentCell.push(h);
    }

    // Get description
    const desc = panel.querySelector('.js-vtabsContent .mds-font_paragraph, .js-vtabsContent p');
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc.textContent.trim();
      contentCell.push(p);
    }

    // Get links
    const links = panel.querySelectorAll('.MMM--vListtohList a, .js-vtabsContent ul a');
    links.forEach((link) => {
      const a = document.createElement('a');
      a.href = link.href;
      a.textContent = link.textContent.trim();
      contentCell.push(a);
    });

    cells.push([[label], contentCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs-industry', cells });
  element.replaceWith(block);
}
