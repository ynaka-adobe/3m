/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroCorporateParser from './parsers/hero-corporate.js';
import cardsNewsParser from './parsers/cards-news.js';
import tabsIndustryParser from './parsers/tabs-industry.js';
import cardsIconLinksParser from './parsers/cards-icon-links.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/3m-cleanup.js';
import sectionsTransformer from './transformers/3m-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-corporate': heroCorporateParser,
  'cards-news': cardsNewsParser,
  'tabs-industry': tabsIndustryParser,
  'cards-icon-links': cardsIconLinksParser,
};

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: '3M corporate homepage with hero banner, news cards, industry tabs, and icon links',
  urls: ['https://www.3m.com/'],
  blocks: [
    {
      name: 'hero-corporate',
      instances: ['.mds-heroBanner'],
    },
    {
      name: 'cards-news',
      instances: ['.js-newsFeedSection .mds-content-cards'],
    },
    {
      name: 'tabs-industry',
      instances: ['#js-homepageVtabs'],
    },
    {
      name: 'cards-icon-links',
      instances: ['.js-whoWeAreSection .mds-content-cards'],
    },
  ],
  sections: [
    {
      id: 'section-1-hero',
      name: 'Hero Banner',
      selector: '.js-homepage_HeroVideo',
      style: null,
      blocks: ['hero-corporate'],
      defaultContent: [],
    },
    {
      id: 'section-2-news',
      name: "What's New",
      selector: '.js-newsFeedSection',
      style: 'light',
      blocks: ['cards-news'],
      defaultContent: ['.js-newsFeedSection .mds-content-cards_title'],
    },
    {
      id: 'section-3-industries',
      name: 'What We Do',
      selector: '#js-homepageVtabs',
      style: null,
      blocks: ['tabs-industry'],
      defaultContent: ['#js-homepageVtabs .MMM--hdg_2'],
    },
    {
      id: 'section-4-about',
      name: 'Who We Are',
      selector: '.js-whoWeAreSection',
      style: 'dark',
      blocks: ['cards-icon-links'],
      defaultContent: ['.js-whoWeAreSection .mds-content-cards_title'],
    },
  ],
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

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
          section: blockDef.section || null,
        });
      });
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
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

    // 4. Execute afterTransform transformers (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path (treat "/" as "index")
    let pathname = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '');
    if (!pathname || pathname === '') pathname = '/index';
    const path = WebImporter.FileUtils.sanitizePath(pathname);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
