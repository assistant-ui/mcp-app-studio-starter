import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getLayoutConfig } from "./chat-thread-layout";

describe("chat thread layout", () => {
  it("top-aligns isolated previews on non-desktop devices", () => {
    const layout = getLayoutConfig({
      variant: "isolated",
      isDesktopDevice: false,
      isDark: false,
      widgetHeight: 400,
    });

    assert.match(layout.morphWrapperClassName, /\bitems-start\b/);
    assert.match(layout.morphWrapperClassName, /\bjustify-start\b/);
    assert.match(layout.morphWrapperClassName, /\bpt-4\b/);
  });

  it("keeps isolated desktop previews centered", () => {
    const layout = getLayoutConfig({
      variant: "isolated",
      isDesktopDevice: true,
      isDark: false,
      widgetHeight: 400,
    });

    assert.match(layout.morphWrapperClassName, /\bitems-center\b/);
    assert.match(layout.morphWrapperClassName, /\bjustify-center\b/);
  });
});
