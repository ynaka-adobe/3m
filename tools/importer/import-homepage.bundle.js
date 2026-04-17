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

  // tools/importer/import-homepage.js
  var import_homepage_exports = {};
  __export(import_homepage_exports, {
    default: () => import_homepage_default
  });

  // tools/importer/parsers/hero-corporate.js
  function parse(element, { document }) {
    const heading = element.querySelector('h1, h2, [class*="hero--text"]');
    const video = element.querySelector("video source");
    const videoSrc = video ? video.getAttribute("src") : null;
    const cells = [];
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (videoSrc) {
      const videoLink = document.createElement("a");
      videoLink.href = videoSrc;
      videoLink.textContent = videoSrc;
      contentCell.push(videoLink);
    }
    if (contentCell.length > 0) cells.push(contentCell);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-corporate", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-news.js
  function parse2(element, { document }) {
    const cards = element.querySelectorAll(".mds-content-cards_grid_card");
    const cells = [];
    cards.forEach((card) => {
      const img = card.querySelector("img");
      const date = card.querySelector(".mds-font_body, p");
      const heading = card.querySelector('h3, [class*="header"]');
      const summary = card.querySelector(".mds-font_body-summary, .mds-font_body-summary p");
      const link = card.querySelector("a[href]");
      const imageCell = [];
      if (img) {
        const newImg = document.createElement("img");
        newImg.src = img.src;
        newImg.alt = img.alt || "";
        imageCell.push(newImg);
      }
      const textCell = [];
      if (date) {
        const p = document.createElement("p");
        p.textContent = date.textContent.trim();
        textCell.push(p);
      }
      if (heading) {
        const h = document.createElement("h3");
        h.textContent = heading.textContent.trim();
        textCell.push(h);
      }
      if (summary) {
        const p = document.createElement("p");
        p.textContent = summary.textContent.trim();
        textCell.push(p);
      }
      if (link) {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = heading ? heading.textContent.trim() : "Read more";
        textCell.push(a);
      }
      if (imageCell.length > 0 || textCell.length > 0) {
        cells.push([imageCell, textCell]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-news", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/tabs-industry.js
  function parse3(element, { document }) {
    const tabLabels = element.querySelectorAll(".MMM--relatedItems-tabs-list a, .MMM--relatedItems-tabs-list button");
    const tabPanels = element.querySelectorAll(".relatedItems-tabs-content-panel");
    const cells = [];
    tabPanels.forEach((panel, i) => {
      const labelEl = tabLabels[i];
      const labelText = labelEl ? labelEl.textContent.trim() : `Tab ${i + 1}`;
      const label = document.createElement("p");
      label.textContent = labelText;
      const contentCell = [];
      const img = panel.querySelector(".relatedCategory-bd > img, .relatedCategory-bd img");
      if (img) {
        const newImg = document.createElement("img");
        newImg.src = img.src;
        newImg.alt = img.alt || "";
        contentCell.push(newImg);
      }
      const heading = panel.querySelector(".js-vtabsContent h3, .mds-font_header--4");
      if (heading) {
        const h = document.createElement("h3");
        h.textContent = heading.textContent.trim();
        contentCell.push(h);
      }
      const desc = panel.querySelector(".js-vtabsContent .mds-font_paragraph, .js-vtabsContent p");
      if (desc) {
        const p = document.createElement("p");
        p.textContent = desc.textContent.trim();
        contentCell.push(p);
      }
      const links = panel.querySelectorAll(".MMM--vListtohList a, .js-vtabsContent ul a");
      links.forEach((link) => {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.textContent.trim();
        contentCell.push(a);
      });
      cells.push([[label], contentCell]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "tabs-industry", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-icon-links.js
  function parse4(element, { document }) {
    const cells = [];
    const items = element.querySelectorAll(".MMM--columnPanel, .MMM--columnList li");
    items.forEach((item) => {
      const icon = item.querySelector("img");
      const link = item.querySelector("a");
      if (!icon && !link) return;
      const imageCell = [];
      if (icon) {
        const newImg = document.createElement("img");
        newImg.src = icon.src;
        newImg.alt = icon.alt || "";
        imageCell.push(newImg);
      }
      const textCell = [];
      if (link) {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.textContent.trim();
        textCell.push(a);
      }
      if (imageCell.length > 0 || textCell.length > 0) {
        cells.push([imageCell, textCell]);
      }
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-icon-links", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/3m-cleanup.js
  var H = { before: "beforeTransform", after: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === H.before) {
      WebImporter.DOMUtils.remove(element, [
        '[id*="cookie"]',
        '[class*="cookie"]',
        '[id*="consent"]',
        '[class*="consent"]',
        "dialog",
        ".m-header_overlay",
        '[class*="Feedback"]'
      ]);
      element.querySelectorAll("p").forEach((p) => {
        if (/^\s*$/.test(p.textContent) && !p.querySelector("img, picture, a")) {
          p.remove();
        }
      });
      element.querySelectorAll("div").forEach((div) => {
        if (div.textContent.trim() === "" && !div.querySelector("img, picture, video, a, table, input")) {
          div.remove();
        }
      });
    }
    if (hookName === H.after) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        "nav",
        ".MMM--siteNav",
        ".hiddenWidgetsDiv",
        ".is-dropdown",
        ".m-header-madbar",
        ".m-navbar",
        ".m-navbar-noStyle",
        ".is-signInPopUp",
        ".m-header--fix",
        ".MAD-Bar",
        '[class*="skip-nav"]',
        '[name="Follower"]',
        '[name="SideBar"]',
        '[name="ibmMainContainer"]',
        "iframe",
        "link",
        "noscript"
      ]);
      element.querySelectorAll("ul").forEach((ul) => {
        if (ul.textContent.includes("Go to US Navigation") || ul.textContent.includes("Go to Page Content")) {
          ul.remove();
        }
      });
      element.querySelectorAll(".component-container, .component-control").forEach((container) => {
        if (container.textContent.trim() === "" && !container.querySelector("img, picture")) {
          container.remove();
        }
      });
      element.querySelectorAll("p").forEach((p) => {
        if (/^\s*$/.test(p.textContent) && !p.querySelector("img, picture, a")) {
          p.remove();
        }
      });
      element.querySelectorAll("a[href]").forEach((a) => {
        const href = a.getAttribute("href");
        if (href) {
          a.setAttribute("href", href.replace(/\\"/g, "").replace(/%5C%22/g, ""));
        }
      });
      element.querySelectorAll("img[src]").forEach((img) => {
        const src = img.getAttribute("src");
        if (src) {
          img.setAttribute("src", src.replace(/\\"/g, "").replace(/%5C%22/g, ""));
        }
      });
    }
  }

  // tools/importer/transformers/3m-sections.js
  var H2 = { before: "beforeTransform", after: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName === H2.after) {
      const { template } = payload;
      if (!template || !template.sections || template.sections.length < 2) return;
      const document = element.ownerDocument;
      const sections = template.sections;
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];
        let sectionEl = null;
        for (const sel of selectors) {
          sectionEl = element.querySelector(sel);
          if (sectionEl) break;
        }
        if (!sectionEl) continue;
        if (section.style) {
          const sectionMetadata = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.after(sectionMetadata);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          sectionEl.before(hr);
        }
      }
    }
  }

  // tools/importer/import-homepage.js
  var parsers = {
    "hero-corporate": parse,
    "cards-news": parse2,
    "tabs-industry": parse3,
    "cards-icon-links": parse4
  };
  var PAGE_TEMPLATE = {
    name: "homepage",
    description: "3M corporate homepage with hero banner, news cards, industry tabs, and icon links",
    urls: ["https://www.3m.com/"],
    blocks: [
      {
        name: "hero-corporate",
        instances: [".mds-heroBanner"]
      },
      {
        name: "cards-news",
        instances: [".js-newsFeedSection .mds-content-cards"]
      },
      {
        name: "tabs-industry",
        instances: ["#js-homepageVtabs"]
      },
      {
        name: "cards-icon-links",
        instances: [".js-whoWeAreSection .mds-content-cards"]
      }
    ],
    sections: [
      {
        id: "section-1-hero",
        name: "Hero Banner",
        selector: ".js-homepage_HeroVideo",
        style: null,
        blocks: ["hero-corporate"],
        defaultContent: []
      },
      {
        id: "section-2-news",
        name: "What's New",
        selector: ".js-newsFeedSection",
        style: "light",
        blocks: ["cards-news"],
        defaultContent: [".js-newsFeedSection .mds-content-cards_title"]
      },
      {
        id: "section-3-industries",
        name: "What We Do",
        selector: "#js-homepageVtabs",
        style: null,
        blocks: ["tabs-industry"],
        defaultContent: ["#js-homepageVtabs .MMM--hdg_2"]
      },
      {
        id: "section-4-about",
        name: "Who We Are",
        selector: ".js-whoWeAreSection",
        style: "dark",
        blocks: ["cards-icon-links"],
        defaultContent: [".js-whoWeAreSection .mds-content-cards_title"]
      }
    ]
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
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_homepage_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      let pathname = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "");
      if (!pathname || pathname === "") pathname = "/index";
      const path = WebImporter.FileUtils.sanitizePath(pathname);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_homepage_exports);
})();
