import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJsonEditorTextChange,
  createJsonEditorChannelState,
  reconcileJsonEditorChannelState,
  serializeJsonEditorValue,
} from "./json-editor-state";

describe("json editor channel state", () => {
  it("serializes empty objects to an empty draft", () => {
    assert.equal(serializeJsonEditorValue({}), "");
  });

  it("applies valid object drafts without rewriting the user's formatting", () => {
    const state = createJsonEditorChannelState({});
    const nextState = applyJsonEditorTextChange(
      state,
      '{\n  "categoryFilter": "cafe"\n}',
      "App State",
    );

    assert.deepEqual(nextState.pendingAppliedValue, {
      categoryFilter: "cafe",
    });
    assert.equal(nextState.text, '{\n  "categoryFilter": "cafe"\n}');
    assert.equal(nextState.invalidMessage, null);
  });

  it("treats null as an empty object draft", () => {
    const state = createJsonEditorChannelState({ selectedPoiId: "1" });
    const nextState = applyJsonEditorTextChange(state, "null", "App State");

    assert.deepEqual(nextState.pendingAppliedValue, {});
    assert.equal(nextState.text, "null");
    assert.equal(nextState.invalidMessage, null);
  });

  it("does not apply an empty draft immediately", () => {
    const state = createJsonEditorChannelState({
      id: "demo-poi-map",
      title: "San Francisco Highlights",
    });
    const nextState = applyJsonEditorTextChange(state, "", "App Props");

    assert.equal(nextState.pendingAppliedValue, null);
    assert.equal(
      nextState.invalidMessage,
      "Empty App Props draft. Type null to clear it. Preview is using the last valid value.",
    );
    assert.equal(
      nextState.appliedValueStr,
      JSON.stringify({
        id: "demo-poi-map",
        title: "San Francisco Highlights",
      }),
    );
  });

  it("rejects valid JSON that is not an object", () => {
    const state = createJsonEditorChannelState({});
    const nextState = applyJsonEditorTextChange(
      state,
      '["museum"]',
      "App State",
    );

    assert.equal(nextState.pendingAppliedValue, null);
    assert.equal(
      nextState.invalidMessage,
      "App State must be a JSON object or null. Preview is using the last valid value.",
    );
  });

  it("preserves an invalid draft when the applied value changes externally", () => {
    const state = createJsonEditorChannelState({});
    const invalidState = applyJsonEditorTextChange(
      state,
      '{"categoryFilter":',
      "App State",
    );

    const reconciled = reconcileJsonEditorChannelState(invalidState, {
      selectedPoiId: "3",
      categoryFilter: null,
    });

    assert.equal(reconciled.text, '{"categoryFilter":');
    assert.equal(
      reconciled.invalidMessage,
      "Invalid App State JSON. Preview is using the last valid value.",
    );
    assert.equal(
      reconciled.appliedValueStr,
      JSON.stringify({
        selectedPoiId: "3",
        categoryFilter: null,
      }),
    );
  });

  it("syncs the visible draft when the applied value changes and no invalid draft exists", () => {
    const state = createJsonEditorChannelState({ categoryFilter: "cafe" });

    const reconciled = reconcileJsonEditorChannelState(state, {
      selectedPoiId: "3",
      categoryFilter: null,
    });

    assert.equal(
      reconciled.text,
      JSON.stringify(
        {
          selectedPoiId: "3",
          categoryFilter: null,
        },
        null,
        2,
      ),
    );
    assert.equal(reconciled.invalidMessage, null);
  });
});
