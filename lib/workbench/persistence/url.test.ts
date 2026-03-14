import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { componentConfigs } from "../component-configs";
import {
  buildPersistedWorkbenchUrl,
  buildUrlParams,
  parseUrlParams,
} from "./url";

describe("workbench URL persistence", () => {
  it("round-trips resizable device mode through build + parse", () => {
    const params = buildUrlParams({
      mode: "pip",
      device: "resizable",
      theme: "light",
      component: "poi-map",
    });
    const reparsed = parseUrlParams(params);

    assert.deepEqual(reparsed, {
      mode: "pip",
      device: "resizable",
      theme: "light",
      component: "poi-map",
    });
  });

  it("falls back to default component when URL component is invalid", () => {
    const parsed = parseUrlParams(
      new URLSearchParams("component=not-a-real-id"),
    );
    const defaultComponent = componentConfigs[0]?.id ?? "welcome";

    assert.equal(parsed.component, defaultComponent);
  });

  it("preserves the current hash and unrelated params when persisting workbench state", () => {
    const nextUrl = buildPersistedWorkbenchUrl({
      currentSearch: "?demo=true&theme=light",
      currentHash: "#keepme",
      state: {
        mode: "inline",
        device: "desktop",
        theme: "dark",
        component: "poi-map",
      },
    });

    assert.equal(
      nextUrl,
      "?demo=true&theme=dark&mode=inline&device=desktop&component=poi-map#keepme",
    );
  });
});
