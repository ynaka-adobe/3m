/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Figma design-snapshot sections.
 *
 * Each top-level <section> in the snapshot <main> is one EDS section.
 * beforeTransform: append a Section Metadata block for sections that declare
 *   data-style, and insert an <hr> before every non-first section.
 * afterTransform: unwrap the <section> elements so only content remains.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element) {
  const doc = element.ownerDocument || document;
  const sections = [...element.querySelectorAll(':scope > section')];

  if (hookName === TransformHook.beforeTransform) {
    sections.forEach((section, i) => {
      const style = (section.getAttribute('data-style') || '').trim();
      if (style) {
        section.append(WebImporter.Blocks.createBlock(doc, {
          name: 'Section Metadata',
          cells: { style },
        }));
      }
      if (i > 0) section.before(doc.createElement('hr'));
    });
  }

  if (hookName === TransformHook.afterTransform) {
    sections.forEach((section) => section.replaceWith(...section.childNodes));
  }
}
