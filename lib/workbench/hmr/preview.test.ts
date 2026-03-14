import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import vm from "node:vm";

const PREVIEW_FILE = path.resolve(
  process.cwd(),
  "lib/workbench/hmr/preview.html",
);

type MessageListener = (event: {
  data?: unknown;
  stopImmediatePropagation?: () => void;
  stopPropagation?: () => void;
}) => void;

function extractBootstrapScript(html: string): string {
  const match = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/);
  if (!match) {
    throw new Error("Could not find preview bootstrap script");
  }
  return match[1];
}

function createClassList() {
  const tokens = new Set<string>();
  return {
    add: (...next: string[]) => {
      for (const token of next) tokens.add(token);
    },
    remove: (...next: string[]) => {
      for (const token of next) tokens.delete(token);
    },
    contains: (token: string) => tokens.has(token),
  };
}

function createPreviewHarness() {
  const listeners = new Map<string, MessageListener[]>();
  const attributes = new Map<string, string>();
  const classList = createClassList();

  const windowObject: {
    __OPENAI_INITIAL_GLOBALS?: unknown;
    addEventListener: (type: string, listener: MessageListener) => void;
  } = {
    addEventListener: (type, listener) => {
      const current = listeners.get(type) ?? [];
      current.push(listener);
      listeners.set(type, current);
    },
  };

  const documentObject = {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value);
      },
      classList,
    },
  };

  return {
    windowObject,
    documentObject,
    attributes,
    classList,
    dispatchMessage(data: unknown) {
      let immediateStopped = false;
      const event = {
        data,
        stopImmediatePropagation: () => {
          immediateStopped = true;
        },
        stopPropagation: () => {},
      };

      for (const listener of listeners.get("message") ?? []) {
        listener(event);
        if (immediateStopped) {
          break;
        }
      }
    },
  };
}

describe("workbench HMR preview bootstrap", () => {
  it("caches OPENAI globals without blocking later message listeners", () => {
    const script = extractBootstrapScript(
      fs.readFileSync(PREVIEW_FILE, "utf8"),
    );
    const harness = createPreviewHarness();

    vm.runInNewContext(script, {
      window: harness.windowObject,
      document: harness.documentObject,
    });

    let shimCalls = 0;
    harness.windowObject.addEventListener("message", () => {
      shimCalls += 1;
    });

    const globals = { previewTheme: "light", toolInput: { city: "SF" } };
    harness.dispatchMessage({
      type: "OPENAI_SET_GLOBALS",
      globals,
    });

    assert.equal(shimCalls, 1);
    assert.deepEqual(harness.windowObject.__OPENAI_INITIAL_GLOBALS, globals);
    assert.equal(harness.attributes.get("data-theme"), "light");
    assert.equal(harness.classList.contains("light"), true);
  });
});
