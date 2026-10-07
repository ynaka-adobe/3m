/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import figmaBlockParser from './parsers/figma-block.js';

// TRANSFORMER IMPORTS
import sectionsTransformer from './transformers/figma-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'figma-site-template',
  description: 'MDS "Core Site - Page Templates" pages transcribed from Figma (MDS for AEM PIlot): SSN breadcrumb/sub-nav, intro hero, stackable image, title with text, campaign hero, content cards, content CTAs, link list',
  urls: [
    'http://localhost:8765/en/figma-site-template-1.html',
  ],
  blocks: [
    {
      name: 'figma-block',
      instances: ['main section > div.figma-block'],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'figma-block': figmaBlockParser,
};

// TRANSFORMER REGISTRY
const transformers = [sectionsTransformer];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          variant: element.getAttribute('data-block'),
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.querySelector('main') || document.body;

    // 1. Execute beforeTransform transformers (section breaks + section metadata)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (unwrap section elements)
    executeTransformers('afterTransform', main, payload);

    // 5. Page metadata (MDS page template drives body.mds styling)
    const hr = document.createElement('hr');
    main.appendChild(hr);
    const meta = {
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      template: 'mds',
    };
    main.append(WebImporter.Blocks.getMetadataBlock(document, meta));
    // Images are already root-relative project media (/media-da/...): keep them
    // as authored rather than rewriting to the snapshot server's origin.

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.variant),
      },
    }];
  },
};
