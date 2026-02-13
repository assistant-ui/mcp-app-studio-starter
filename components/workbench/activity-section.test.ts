import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConsoleEntry } from "@/lib/workbench/types";
import { groupCallToolEntries } from "./activity-section";

function createEntry(
  id: string,
  method: string,
  args?: unknown,
  result?: unknown,
): ConsoleEntry {
  return {
    id,
    timestamp: new Date("2026-02-13T00:00:00.000Z"),
    type: "callTool",
    method,
    args,
    result,
  };
}

describe("groupCallToolEntries", () => {
  it("pairs concurrent same-tool requests with responses in FIFO order", () => {
    const requestOne = createEntry("req-1", 'callTool("search")', {
      query: "first",
    });
    const requestTwo = createEntry("req-2", 'callTool("search")', {
      query: "second",
    });
    const responseOne = createEntry(
      "res-1",
      'callTool("search") → response',
      undefined,
      { batch: 1 },
    );
    const responseTwo = createEntry(
      "res-2",
      'callTool("search") → response',
      undefined,
      { batch: 2 },
    );

    const grouped = groupCallToolEntries([
      requestOne,
      requestTwo,
      responseOne,
      responseTwo,
    ]);

    assert.equal(grouped.length, 2);
    assert.equal("request" in grouped[0], true);
    assert.equal("request" in grouped[1], true);

    const firstGroup = grouped[0] as {
      request: ConsoleEntry;
      response: ConsoleEntry | null;
    };
    const secondGroup = grouped[1] as {
      request: ConsoleEntry;
      response: ConsoleEntry | null;
    };

    assert.equal(firstGroup.request.id, "req-1");
    assert.equal(firstGroup.response?.id, "res-1");
    assert.equal(secondGroup.request.id, "req-2");
    assert.equal(secondGroup.response?.id, "res-2");
  });
});
