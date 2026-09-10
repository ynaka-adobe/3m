/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-government-landing.js
  var import_government_landing_exports = {};
  __export(import_government_landing_exports, {
    default: () => import_government_landing_default
  });

  // tools/importer/parsers/hero.js
  function parse(element, { document: document2 }) {
    const bgImage = element.querySelector(
      ".MDS-bannerHero_imgContainer img, .MDS-bannerHero_imgContainer picture, img, picture"
    );
    const heading = element.querySelector(
      ".MDS-bannerHero_content h1, .MDS-bannerHero_content h2, .MDS-bannerHero_content h3, h1, h2, h3"
    );
    if (!bgImage && !heading) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    const contentCell = [];
    if (heading) contentCell.push(heading);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document2, { name: "hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-links.js
  function parse2(element, { document: document2 }) {
    const items = element.querySelectorAll(":scope ul > li");
    const cells = [];
    items.forEach((li) => {
      const img = li.querySelector("img, picture");
      const link = li.querySelector("a");
      const caption = li.querySelector("p");
      const content = [];
      if (link) content.push(link);
      if (caption) content.push(caption);
      cells.push([img || "", content]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const ul = element.querySelector(":scope ul");
    const preserved = [...element.querySelectorAll("hr, h1, h2, h3, h4, h5, h6")].filter((n) => !ul || !ul.contains(n));
    const block = WebImporter.Blocks.createBlock(document2, { name: "Cards (links)", cells });
    element.replaceWith(...preserved, block);
  }

  // tools/importer/parsers/cards-products.js
  function parse3(element, { document: document2 }) {
    const items = element.querySelectorAll(":scope ul > li");
    const cells = [];
    items.forEach((li) => {
      const cardLink = li.querySelector("a");
      const img = li.querySelector(".MDS-cardsContentComplex_cardImg img, img, picture");
      const titleText = li.querySelector(".mds-font_header--5");
      const details = li.querySelector(".MDS-cardsContentComplex_cardDetails");
      let descText = null;
      if (details) {
        descText = [...details.children].find((c) => c !== titleText && c.textContent.trim());
      }
      const content = [];
      if (titleText) {
        const h = document2.createElement("h3");
        h.textContent = titleText.textContent.trim();
        content.push(h);
      }
      if (descText) {
        const p = document2.createElement("p");
        p.textContent = descText.textContent.trim();
        content.push(p);
      }
      if (cardLink) {
        const a = document2.createElement("a");
        a.setAttribute("href", cardLink.getAttribute("href"));
        a.textContent = titleText ? titleText.textContent.trim() : cardLink.textContent.trim() || "Learn more";
        content.push(a);
      }
      cells.push([img || "", content]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const ul = element.querySelector(":scope ul");
    const preserved = [...element.querySelectorAll("hr, h1, h2, h3, h4, h5, h6")].filter((n) => !ul || !ul.contains(n));
    const block = WebImporter.Blocks.createBlock(document2, { name: "Cards (products)", cells });
    element.replaceWith(...preserved, block);
  }

  // tools/importer/parsers/cards.js
  function parse4(element, { document: document2 }) {
    const items = element.querySelectorAll(":scope ul > li");
    const cells = [];
    items.forEach((li) => {
      const cardLink = li.querySelector("a");
      const img = li.querySelector("img, picture");
      const titleEl = li.querySelector(".MDS-core_link--secondary, .mds-font_header--5");
      let bodyEl = li.querySelector(".MDS-core_body");
      if (!bodyEl) {
        const details = li.querySelector(".MDS-cardsContentComplex_cardDetails");
        if (details) {
          bodyEl = [...details.children].find((c) => c !== titleEl && c.textContent.trim());
        }
      }
      const content = [];
      if (titleEl) {
        const h = document2.createElement("h3");
        h.textContent = titleEl.textContent.trim();
        content.push(h);
      }
      if (bodyEl) {
        const p = document2.createElement("p");
        p.textContent = bodyEl.textContent.trim();
        content.push(p);
      }
      if (cardLink) {
        const a = document2.createElement("a");
        a.setAttribute("href", cardLink.getAttribute("href"));
        a.textContent = titleEl ? titleEl.textContent.trim() : cardLink.textContent.trim() || "Learn more";
        content.push(a);
      }
      cells.push([img || "", content]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const ul = element.querySelector(":scope ul");
    const preserved = [...element.querySelectorAll("hr, h1, h2, h3, h4, h5, h6")].filter((n) => !ul || !ul.contains(n));
    const block = WebImporter.Blocks.createBlock(document2, { name: "cards", cells });
    element.replaceWith(...preserved, block);
  }

  // tools/importer/parsers/contact-cta.js
  function parse5(element, { document: document2 }) {
    const heading = element.querySelector("h1, h2, h3");
    const bodyPs = [...element.querySelectorAll("p")].filter(
      (p) => !p.closest(".footer-buttons")
    );
    const ctaLinks = [...element.querySelectorAll(".footer-buttons a, a:has(button)")];
    if (!heading && bodyPs.length === 0 && ctaLinks.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (heading) cells.push([heading]);
    if (bodyPs.length) cells.push([bodyPs]);
    if (ctaLinks.length) {
      const actions = ctaLinks.map((a) => {
        const link = document2.createElement("a");
        link.setAttribute("href", a.getAttribute("href"));
        link.textContent = a.textContent.trim();
        return link;
      });
      cells.push([actions]);
    }
    const block = WebImporter.Blocks.createBlock(document2, { name: "contact-cta", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/3m-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, ["ol.MMM--breadcrumbs-list"]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "iframe",
        "source"
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("style");
        el.removeAttribute("onclick");
        el.removeAttribute("data-track");
      });
    }
  }

  // tools/importer/transformers/3m-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function findSectionElement(root, selector) {
    let el = root.querySelector(selector);
    if (el) return el;
    const child = selector.replace(/^\s*div\.MDS\s*>\s*/, "");
    if (child && child !== selector) {
      el = root.querySelector(child);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.beforeTransform) {
      const sections = payload && payload.template && Array.isArray(payload.template.sections) ? payload.template.sections : [];
      if (sections.length < 2) return;
      const doc = element.ownerDocument || document;
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const sectionEl = findSectionElement(element, section.selector);
        if (!sectionEl) continue;
        if (section.style) {
          const metaBlock = WebImporter.Blocks.createBlock(doc, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.after(metaBlock);
        }
        if (i > 0) {
          const hr = doc.createElement("hr");
          sectionEl.before(hr);
        }
      }
    }
  }

  // tools/importer/import-government-landing.js
  var PAGE_TEMPLATE = {
    name: "government-landing",
    description: "3M Government market landing page with hero banner, mission intro, help links, icon card grid of government segments, article cards, keep-exploring cards, and customer support section",
    urls: [
      "https://www.3m.com/3M/en_US/government-us/"
    ],
    blocks: [
      {
        name: "hero",
        instances: ["div.MDS > div.MDS-bannerHero"]
      },
      {
        name: "cards-links",
        instances: ["div.MDS > div.MDS-cardsIconBlock"]
      },
      {
        name: "cards-products",
        instances: ["div.MDS > div.MDS-cardsContentComplex.product-cards--4"]
      },
      {
        name: "cards",
        instances: [
          "div.MDS > div.MDS-cardsArticles",
          "div.MDS > div.MDS-cardsContentComplex.mds-3cards-container-w"
        ]
      },
      {
        name: "contact-cta",
        instances: ["div.MDS > div.mds-footer.MDS-mmm-flex-col"]
      }
    ],
    sections: [
      {
        id: "hero",
        name: "Hero Banner",
        selector: "div.MDS > div.MDS-bannerHero",
        style: null,
        blocks: ["hero"],
        defaultContent: []
      },
      {
        id: "mission-intro",
        name: "Mission Intro",
        selector: "div.MDS > div.MDS-cardsContentComplex.bb-10",
        style: null,
        blocks: [],
        defaultContent: [
          "div.MDS-cardsContentComplex_heading > h3",
          "div.MDS-cardsContentComplex_heading > p"
        ]
      },
      {
        id: "here-to-help",
        name: "We Are Here To Help",
        selector: "div.MDS > div.MDS-cardsIconBlock",
        style: null,
        blocks: ["cards-links"],
        defaultContent: ["div.MDS-cardsIconBlock > h3"]
      },
      {
        id: "government-grid",
        name: "Government Segments Grid",
        selector: "div.MDS > div.MDS-cardsContentComplex.product-cards--4",
        style: null,
        blocks: ["cards-products"],
        defaultContent: ["div.MDS-cardsContentComplex.product-cards--4 > div.MDS-cardsContentComplex_heading"]
      },
      {
        id: "proof-science",
        name: "Proof Is In The Science",
        selector: "div.MDS > div.MDS-cardsArticles",
        style: "grey",
        blocks: ["cards"],
        defaultContent: ["div.MDS-cardsArticles > hr", "div.MDS-cardsArticles > h2"]
      },
      {
        id: "keep-exploring",
        name: "Keep Exploring",
        selector: "div.MDS > div.MDS-cardsContentComplex.mds-3cards-container-w",
        style: null,
        blocks: ["cards"],
        defaultContent: ["div.MDS-cardsContentComplex.mds-3cards-container-w > div.MDS-cardsContentComplex_heading"]
      },
      {
        id: "customer-support",
        name: "Customer Support",
        selector: "div.MDS > div.mds-footer.MDS-mmm-flex-col",
        style: null,
        blocks: ["contact-cta"],
        defaultContent: []
      }
    ]
  };
  var parsers = {
    hero: parse,
    "cards-links": parse2,
    "cards-products": parse3,
    cards: parse4,
    "contact-cta": parse5
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document2, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        const elements = document2.querySelectorAll(selector);
        if (elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_government_landing_default = {
    transform: (payload) => {
      const {
        document: document2,
        url,
        html,
        params
      } = payload;
      const main = document2.querySelector("#pageContent") || document2.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document2, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document: document2, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document2.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document2);
      WebImporter.rules.transformBackgroundImages(main, document2);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_government_landing_exports);
})();
