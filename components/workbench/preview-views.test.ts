import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampResizablePreviewWidth,
  resolvePreviewDeviceWidth,
  shouldShowPreviewResizeHandles,
  shouldUsePreviewStage,
} from "./preview-views";

describe("shouldShowPreviewResizeHandles", () => {
  it("only exposes resize handles for the resizable device mode", () => {
    assert.equal(shouldShowPreviewResizeHandles("desktop"), false);
    assert.equal(shouldShowPreviewResizeHandles("tablet"), false);
    assert.equal(shouldShowPreviewResizeHandles("mobile"), false);
    assert.equal(shouldShowPreviewResizeHandles("resizable"), true);
  });
});

describe("shouldUsePreviewStage", () => {
  it("keeps wide desktop and wide tablet on the same stage surface", () => {
    assert.equal(shouldUsePreviewStage("desktop", 1200), true);
    assert.equal(shouldUsePreviewStage("tablet", 1200), true);
  });

  it("stays full-bleed on narrower viewports", () => {
    assert.equal(shouldUsePreviewStage("desktop", 700), false);
    assert.equal(shouldUsePreviewStage("tablet", 700), false);
  });
});

describe("resolvePreviewDeviceWidth", () => {
  it("uses the live resizable width instead of the preset placeholder", () => {
    assert.equal(resolvePreviewDeviceWidth("resizable", 512), 512);
  });

  it("uses numeric device presets for framed devices", () => {
    assert.equal(resolvePreviewDeviceWidth("mobile", 512), 375);
    assert.equal(resolvePreviewDeviceWidth("tablet", 512), 768);
    assert.equal(resolvePreviewDeviceWidth("desktop", 512), 0);
  });
});

describe("clampResizablePreviewWidth", () => {
  it("uses the mobile baseline as the minimum resizable width", () => {
    assert.equal(clampResizablePreviewWidth(280), 375);
    assert.equal(clampResizablePreviewWidth(375), 375);
  });

  it("preserves widths within the supported range", () => {
    assert.equal(clampResizablePreviewWidth(640), 640);
  });

  it("caps widths at the configured maximum", () => {
    assert.equal(clampResizablePreviewWidth(1600), 1200);
  });
});
