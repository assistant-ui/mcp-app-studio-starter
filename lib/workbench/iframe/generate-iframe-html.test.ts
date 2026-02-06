import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { OpenAIGlobals } from "../types";
import {
  generateEmptyIframeHtml,
  generateIframeHtml,
} from "./generate-iframe-html";

const TEST_GLOBALS: OpenAIGlobals = {
  theme: "light",
  locale: "en-US",
  displayMode: "inline",
  previousDisplayMode: null,
  maxHeight: 600,
  toolInput: {},
  toolOutput: null,
  toolResponseMetadata: null,
  widgetState: null,
  userAgent: {
    device: { type: "desktop" },
    capabilities: { hover: true, touch: false },
  },
  safeArea: {
    insets: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  view: null,
  userLocation: null,
};

describe("generateIframeHtml", () => {
  it("includes the OpenAI shim by default", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
    });

    assert.equal(html.includes("OPENAI_METHOD_CALL"), true);
    assert.equal(html.includes("window.__initOpenAIGlobals"), true);
  });

  it("omits the OpenAI shim when includeOpenAIShim=false", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      includeOpenAIShim: false,
    });

    assert.equal(html.includes("OPENAI_METHOD_CALL"), false);
    assert.equal(html.includes("window.__initOpenAIGlobals"), false);
    assert.equal(
      html.includes('Object.defineProperty(window, "openai"'),
      false,
    );
  });

  it("includes external css link when cssHref is provided", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      cssHref: "/workbench-bundles/demo.css",
      useTailwindCdn: false,
    });

    assert.equal(
      html.includes(
        '<link rel="stylesheet" href="/workbench-bundles/demo.css">',
      ),
      true,
    );
  });

  it("defines a full-height root sizing chain for h-full layouts", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: false,
    });

    assert.equal(html.includes("html,\nbody {"), true);
    assert.equal(
      html.includes("#root {\n  width: 100%;\n  height: 100%;"),
      true,
    );
  });

  it("uses OKLCH token defaults compatible with demo.css", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      cssHref: "/workbench-bundles/demo.css",
      useTailwindCdn: false,
    });

    assert.equal(html.includes("--background: oklch(1 0 0);"), true);
    assert.equal(html.includes("--background: 0 0% 100%;"), false);
  });
});

describe("generateEmptyIframeHtml", () => {
  it("omits the OpenAI shim when includeOpenAIShim=false", () => {
    const html = generateEmptyIframeHtml(TEST_GLOBALS, true, false);

    assert.equal(html.includes("OPENAI_METHOD_CALL"), false);
    assert.equal(html.includes("window.__initOpenAIGlobals"), false);
  });

  it("includes external css link when cssHref is provided", () => {
    const html = generateEmptyIframeHtml(
      TEST_GLOBALS,
      false,
      false,
      "/workbench-bundles/demo.css",
    );

    assert.equal(
      html.includes(
        '<link rel="stylesheet" href="/workbench-bundles/demo.css">',
      ),
      true,
    );
  });
});
