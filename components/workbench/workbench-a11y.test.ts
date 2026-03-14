import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

describe("workbench accessibility regressions", () => {
  it("gives the mock composer send button an accessible name", async () => {
    const importedModule = (await import("./mock-composer")) as any;
    const mockComposerModule = (importedModule.default ??
      importedModule["module.exports"] ??
      importedModule) as {
      MockComposer: React.ComponentType<{ variant?: "bottom" | "overlay" }>;
    };
    const { MockComposer } = mockComposerModule;

    const html = renderToStaticMarkup(
      React.createElement(MockComposer, { variant: "bottom" }),
    );

    assert.match(html, /aria-label="Send message"/);
  });

  it("gives the visible editor reset control an accessible name", async () => {
    const importedModule = (await import("./editor-panel")) as any;
    const editorPanelModule = (importedModule.default ??
      importedModule["module.exports"] ??
      importedModule) as {
      EditorPanel: React.ComponentType;
    };
    const { EditorPanel } = editorPanelModule;

    const html = renderToStaticMarkup(React.createElement(EditorPanel));

    assert.match(html, /aria-label="Reset App Props"/);
  });
});
