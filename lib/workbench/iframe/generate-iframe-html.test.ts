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

  it("includes optional checkout/open-in-app extension methods in the shim", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
    });

    assert.equal(html.includes('callMethod("setOpenInAppUrl"'), true);
    assert.equal(html.includes('callMethod("requestCheckout"'), true);
  });

  it("stops OPENAI globals messages from reaching the MCP transport", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
    });

    assert.equal(html.includes("event.stopImmediatePropagation?.();"), true);
    assert.equal(html.includes("event.stopPropagation?.();"), true);
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

  it("applies preview surface background token to html/body/root", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: false,
    });

    assert.equal(
      html.includes("background-color: var(--preview-bg) !important;"),
      true,
    );
    assert.equal(html.includes("background-color: transparent;"), false);
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

  it("maps tailwind CDN color tokens using alpha-preserving CSS variables", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: true,
    });

    assert.equal(
      html.includes(
        "border:\n            'color-mix(in oklch, var(--border) calc(<alpha-value> * 100%), transparent)'",
      ),
      true,
    );
    assert.equal(html.includes("border: 'hsl(var(--border))'"), false);
  });

  it("supports opacity utilities for token colors in tailwind CDN mode", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: true,
    });

    assert.equal(html.includes("calc(<alpha-value> * 100%)"), true);
    assert.equal(html.includes("oklch(from var(--border)"), false);
  });

  it("preserves dark token base alpha before applying opacity utilities", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: true,
    });

    assert.equal(html.includes("--border: oklch(1 0 0 / 10%);"), true);
    assert.equal(
      html.includes(
        "color-mix(in oklch, var(--border) calc(<alpha-value> * 100%), transparent)",
      ),
      true,
    );
  });

  it("includes dark-mode leaflet tile backdrop overrides", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: true,
    });

    assert.equal(html.includes(".dark .leaflet-tile-pane"), true);
    assert.equal(html.includes('[data-theme="dark"] .leaflet-tile'), true);
  });

  it("uses theme class and data-theme attributes from initial globals", () => {
    const darkHtml = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: { ...TEST_GLOBALS, theme: "dark" },
      useTailwindCdn: false,
    });

    assert.equal(
      darkHtml.includes('<html lang="en-US" class="dark" data-theme="dark">'),
      true,
    );
  });

  it("defines preview surface variables for light and dark themes", () => {
    const html = generateIframeHtml({
      widgetBundle: "console.log('widget')",
      initialGlobals: TEST_GLOBALS,
      useTailwindCdn: false,
    });

    assert.equal(html.includes("--preview-bg: oklch(1 0 0);"), true);
    assert.equal(html.includes("--preview-bg: oklch(0.205 0 0);"), true);
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
