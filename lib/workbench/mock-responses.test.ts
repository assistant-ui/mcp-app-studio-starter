import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MockConfigState } from "./mock-config";
import { createToolMockConfig } from "./mock-config";
import { handleMockToolCall } from "./mock-responses";

function createMockConfig(toolName: string): MockConfigState {
  return {
    globalEnabled: true,
    serverUrl: "http://localhost:3001/mcp",
    tools: {
      [toolName]: createToolMockConfig(toolName),
    },
  };
}

describe("handleMockToolCall", () => {
  it("uses tool-level mockResponse when no active variant is selected", async () => {
    const toolName = "custom_tool";
    const mockConfig = createMockConfig(toolName);
    mockConfig.tools[toolName].mockResponse = {
      structuredContent: { source: "mockResponse", value: 42 },
      _meta: { tag: "from-panel" },
    };

    const result = await handleMockToolCall(toolName, {}, mockConfig);

    assert.deepEqual(result.structuredContent, {
      source: "mockResponse",
      value: 42,
    });
    assert.deepEqual(result._meta, { tag: "from-panel" });
    assert.equal(result._mockVariant, undefined);
  });

  it("prefers active variant response over tool-level mockResponse", async () => {
    const toolName = "custom_tool";
    const mockConfig = createMockConfig(toolName);
    const [firstVariant] = mockConfig.tools[toolName].variants;
    firstVariant.delay = 0;
    firstVariant.response = { structuredContent: { source: "variant" } };
    mockConfig.tools[toolName].activeVariantId = firstVariant.id;
    mockConfig.tools[toolName].mockResponse = {
      structuredContent: { source: "mockResponse" },
    };

    const result = await handleMockToolCall(toolName, {}, mockConfig);

    assert.deepEqual(result.structuredContent, { source: "variant" });
    assert.equal(result._mockVariant, firstVariant.name);
  });
});
