import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildUrlParams, parseUrlParams } from "./url";

describe("workbench URL persistence", () => {
  it("parses resizable device mode from URL params", () => {
    const parsed = parseUrlParams(
      new URLSearchParams("mode=inline&device=resizable&theme=dark"),
    );

    assert.equal(parsed.device, "resizable");
  });

  it("round-trips resizable device mode through build + parse", () => {
    const params = buildUrlParams({
      mode: "pip",
      device: "resizable",
      theme: "light",
    });
    const reparsed = parseUrlParams(params);

    assert.deepEqual(reparsed, {
      mode: "pip",
      device: "resizable",
      theme: "light",
    });
  });
});
