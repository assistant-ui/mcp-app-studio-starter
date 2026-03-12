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
    const result = applyJsonEditorTextChange(
      state,
      '{\n  "categoryFilter": "cafe"\n}',
      "App State",
    );

    assert.deepEqual(result.nextState.pendingAppliedValue, {
      categoryFilter: "cafe",
    });
    assert.equal(result.nextState.text, '{\n  "categoryFilter": "cafe"\n}');
    assert.equal(result.nextState.invalidMessage, null);
  });

  it("treats null as an empty object draft", () => {
    const state = createJsonEditorChannelState({ selectedPoiId: "1" });
    const result = applyJsonEditorTextChange(state, "null", "App State");

    assert.deepEqual(result.nextState.pendingAppliedValue, {});
    assert.equal(result.nextState.text, "null");
    assert.equal(result.nextState.invalidMessage, null);
  });

  it("does not apply an empty draft immediately", () => {
    const state = createJsonEditorChannelState({
      id: "demo-poi-map",
      title: "San Francisco Highlights",
    });
    const result = applyJsonEditorTextChange(state, "", "App Props");

    assert.equal(result.nextState.pendingAppliedValue, null);
    assert.equal(
      result.nextState.invalidMessage,
      "Empty App Props draft. Type null to clear it. Preview is using the last valid value.",
    );
    assert.equal(
      result.nextState.appliedValueStr,
      JSON.stringify({
        id: "demo-poi-map",
        title: "San Francisco Highlights",
      }),
    );
  });

  it("rejects valid JSON that is not an object", () => {
    const state = createJsonEditorChannelState({});
    const result = applyJsonEditorTextChange(state, '["museum"]', "App State");

    assert.equal(result.nextState.pendingAppliedValue, null);
    assert.equal(
      result.nextState.invalidMessage,
      "App State must be a JSON object or null. Preview is using the last valid value.",
    );
  });

  it("preserves an invalid draft when the applied value changes externally", () => {
    const state = createJsonEditorChannelState({});
    const invalidResult = applyJsonEditorTextChange(
      state,
      '{"categoryFilter":',
      "App State",
    );

    const reconciled = reconcileJsonEditorChannelState(
      invalidResult.nextState,
      {
        selectedPoiId: "3",
        categoryFilter: null,
      },
    );

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
