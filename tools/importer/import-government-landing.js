/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroParser from './parsers/hero.js';
import cardsLinksParser from './parsers/cards-links.js';
import cardsProductsParser from './parsers/cards-products.js';
import cardsParser from './parsers/cards.js';
import contactCtaParser from './parsers/contact-cta.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/3m-cleanup.js';
import sectionsTransformer from './transformers/3m-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'government-landing',
  description: '3M Government market landing page with hero banner, mission intro, help links, icon card grid of government segments, article cards, keep-exploring cards, and customer support section',
  urls: [
    'https://www.3m.com/3M/en_US/government-us/',
  ],
  blocks: [
    {
      name: 'hero',
      instances: ['div.MDS > div.MDS-bannerHero'],
    },
    {
      name: 'cards-links',
      instances: ['div.MDS > div.MDS-cardsIconBlock'],
    },
    {
      name: 'cards-products',
      instances: ['div.MDS > div.MDS-cardsContentComplex.product-cards--4'],
    },
    {
      name: 'cards',
      instances: [
        'div.MDS > div.MDS-cardsArticles',
        'div.MDS > div.MDS-cardsContentComplex.mds-3cards-container-w',
      ],
    },
    {
      name: 'contact-cta',
      instances: ['div.MDS > div.mds-footer.MDS-mmm-flex-col'],
    },
  ],
  sections: [
    {
      id: 'hero',
      name: 'Hero Banner',
      selector: 'div.MDS > div.MDS-bannerHero',
      style: null,
      blocks: ['hero'],
      defaultContent: [],
    },
    {
      id: 'mission-intro',
      name: 'Mission Intro',
      selector: 'div.MDS > div.MDS-cardsContentComplex.bb-10',
      style: null,
      blocks: [],
      defaultContent: [
        'div.MDS-cardsContentComplex_heading > h3',
        'div.MDS-cardsContentComplex_heading > p',
      ],
    },
    {
      id: 'here-to-help',
      name: 'We Are Here To Help',
      selector: 'div.MDS > div.MDS-cardsIconBlock',
      style: null,
      blocks: ['cards-links'],
      defaultContent: ['div.MDS-cardsIconBlock > h3'],
    },
    {
      id: 'government-grid',
      name: 'Government Segments Grid',
      selector: 'div.MDS > div.MDS-cardsContentComplex.product-cards--4',
      style: null,
      blocks: ['cards-products'],
      defaultContent: ['div.MDS-cardsContentComplex.product-cards--4 > div.MDS-cardsContentComplex_heading'],
    },
    {
      id: 'proof-science',
      name: 'Proof Is In The Science',
      selector: 'div.MDS > div.MDS-cardsArticles',
      style: 'grey',
      blocks: ['cards'],
      defaultContent: ['div.MDS-cardsArticles > hr', 'div.MDS-cardsArticles > h2'],
    },
    {
      id: 'keep-exploring',
      name: 'Keep Exploring',
      selector: 'div.MDS > div.MDS-cardsContentComplex.mds-3cards-container-w',
      style: null,
      blocks: ['cards'],
      defaultContent: ['div.MDS-cardsContentComplex.mds-3cards-container-w > div.MDS-cardsContentComplex_heading'],
    },
    {
      id: 'customer-support',
      name: 'Customer Support',
      selector: 'div.MDS > div.mds-footer.MDS-mmm-flex-col',
      style: null,
      blocks: ['contact-cta'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  hero: heroParser,
  'cards-links': cardsLinksParser,
  'cards-products': cardsProductsParser,
  cards: cardsParser,
  'contact-cta': contactCtaParser,
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

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    // Scope to the authored content root (div.MDS#pageContent). This excludes
    // the site shell (skip links #top, header nav.m-nav, footer div.m-footer,
    // and the cookie-consent dialog) which live outside #pageContent.
    const main = document.querySelector('#pageContent') || document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return; // Already replaced by earlier parser
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
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
