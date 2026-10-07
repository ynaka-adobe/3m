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

  // tools/importer/import-figma-site-template.js
  var import_figma_site_template_exports = {};
  __export(import_figma_site_template_exports, {
    default: () => import_figma_site_template_default
  });

  // tools/importer/parsers/figma-block.js
  function parse(element, { document: document2 }) {
    const name = (element.getAttribute("data-block") || "").trim();
    if (!name) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [...element.querySelectorAll(":scope > .row")].map((row) => [...row.querySelectorAll(":scope > .cell")].map((cell) => [...cell.childNodes]));
    const block = WebImporter.Blocks.createBlock(document2, { name, cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/figma-sections.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element) {
    const doc = element.ownerDocument || document;
    const sections = [...element.querySelectorAll(":scope > section")];
    if (hookName === TransformHook.beforeTransform) {
      sections.forEach((section, i) => {
        const style = (section.getAttribute("data-style") || "").trim();
        if (style) {
          section.append(WebImporter.Blocks.createBlock(doc, {
            name: "Section Metadata",
            cells: { style }
          }));
        }
        if (i > 0) section.before(doc.createElement("hr"));
      });
    }
    if (hookName === TransformHook.afterTransform) {
      sections.forEach((section) => section.replaceWith(...section.childNodes));
    }
  }

  // tools/importer/import-figma-site-template.js
  var PAGE_TEMPLATE = {
    name: "figma-site-template",
    description: 'MDS "Core Site - Page Templates" pages transcribed from Figma (MDS for AEM PIlot): SSN breadcrumb/sub-nav, intro hero, stackable image, title with text, campaign hero, content cards, content CTAs, link list',
    urls: [
      "http://localhost:8765/en/figma-site-template-1.html"
    ],
    blocks: [
      {
        name: "figma-block",
        instances: ["main section > div.figma-block"]
      }
    ]
  };
  var parsers = {
    "figma-block": parse
  };
  var transformers = [transform];
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
            variant: element.getAttribute("data-block")
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_figma_site_template_default = {
    transform: (payload) => {
      var _a;
      const {
        document: document2,
        url,
        html,
        params
      } = payload;
      const main = document2.querySelector("main") || document2.body;
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
      const meta = {
        title: document2.title,
        description: ((_a = document2.querySelector('meta[name="description"]')) == null ? void 0 : _a.content) || "",
        template: "mds"
      };
      main.append(WebImporter.Blocks.getMetadataBlock(document2, meta));
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
      return [{
        element: main,
        path,
        report: {
          title: document2.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.variant)
        }
      }];
    }
  };
  return __toCommonJS(import_figma_site_template_exports);
})();
