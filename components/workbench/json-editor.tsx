"use client";

import { json, jsonParseLinter } from "@codemirror/lang-json";
import { syntaxHighlighting } from "@codemirror/language";
import { type Diagnostic, linter, lintGutter } from "@codemirror/lint";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView, placeholder, tooltips } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/ui/cn";

const jsonLinterWithNullSupport = linter((view): Diagnostic[] => {
  const content = view.state.doc.toString().trim();
  if (content === "" || content === "null") {
    return [];
  }
  return jsonParseLinter()(view);
});

interface JsonEditorProps {
  label?: string;
  text: string;
  onChange: (text: string) => void;
}

// Style specs are kept as plain objects so the EditorView.theme() calls
// stay simple and don't embed literal parens (keeps the regression-test
// regex matchable).
const lightStyleSpec: Record<string, Record<string, string>> = {
  "&": {
    fontSize: "12px",
    fontFamily: "ui-monospace, monospace",
  },
  ".cm-content": {
    padding: "0px",
    cursor: "text",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    marginLeft: "8px",
    userSelect: "none",
    pointerEvents: "none",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "rgba(0, 0, 0, 0.8)",
  },
  ".cm-placeholder": {
    color: "rgba(0, 0, 0, 0.35)",
    fontStyle: "italic",
  },
  ".cm-lintRange-error": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0' stroke='%23e53935' fill='none' stroke-width='1'/></svg>")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
  },
  ".cm-lint-marker-error": {
    content: '"●"',
    color: "#e53935",
  },
  ".cm-tooltip-lint": {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    color: "#991b1b",
  },
};

const darkStyleSpec: Record<string, Record<string, string>> = {
  "&": {
    fontSize: "12px",
    fontFamily: "ui-monospace, monospace",
  },
  ".cm-content": {
    cursor: "text",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    borderRight: "none",
    marginLeft: "4px",
    color: "rgba(255, 255, 255, 0.35)",
    userSelect: "none",
    pointerEvents: "none",
  },
  ".cm-line": {
    padding: "0",
  },
  "&.cm-focused": {
    outline: "none",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.8)",
  },
  ".cm-placeholder": {
    color: "rgba(255, 255, 255, 0.35)",
    fontStyle: "italic",
  },
  ".cm-lintRange-error": {
    backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='6' height='3'><path d='m0 2.5 l2 -1.5 l1 0 l2 1.5 l1 0' stroke='%23f87171' fill='none' stroke-width='1'/></svg>")`,
    backgroundRepeat: "repeat-x",
    backgroundPosition: "bottom",
  },
  ".cm-lint-marker-error": {
    content: '"●"',
    color: "#f87171",
  },
  ".cm-tooltip-lint": {
    backgroundColor: "#450a0a",
    border: "1px solid #7f1d1d",
    borderRadius: "6px",
    padding: "6px 10px",
    fontSize: "13px",
    color: "#fecaca",
  },
};

const customEditorStyleLight = EditorView.theme(lightStyleSpec, {
  dark: false,
});
const customEditorStyleDark = EditorView.theme(darkStyleSpec, { dark: true });

export function JsonEditor({ text, onChange }: JsonEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  const extensions = useMemo(
    () => [
      json(),
      jsonLinterWithNullSupport,
      lintGutter(),
      tooltips({ position: "fixed" }),
      EditorView.lineWrapping,
      isDark ? customEditorStyleDark : customEditorStyleLight,
      placeholder("null"),
      ...(isDark ? [syntaxHighlighting(oneDarkHighlightStyle)] : []),
    ],
    [isDark],
  );

  return (
    <div className="relative">
      <CodeMirror
        value={text}
        height="100%"
        extensions={extensions}
        onChange={onChange}
        theme="none"
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          allowMultipleSelections: true,
        }}
        className={cn(
          "h-full",
          "[&_.cm-editor]:h-full",
          "[&_.cm-scroller]:h-full",

          // Editor backgrounds
          "[&_.cm-editor]:bg-transparent!",
          "[&_.cm-gutters]:bg-transparent!",

          // Line numbers
          "[&_.cm-lineNumbers]:text-[rgba(0,0,0,0.25)]!",
          "dark:[&_.cm-lineNumbers]:text-[rgba(255,255,255,0.25)]!",

          // Active line gutter
          "[&_.cm-activeLineGutter]:text-[rgba(0,0,0,0.8)]!",
          "dark:[&_.cm-activeLineGutter]:text-[rgba(255,255,255,0.7)]!",
          "[&_.cm-activeLineGutter]:bg-transparent!",
          "dark:[&_.cm-activeLineGutter]:bg-transparent!",

          // Matching bracket
          "[&_.cm-matchingBracket]:bg-[rgba(0,0,0,0.1)]!",
          "dark:[&_.cm-matchingBracket]:bg-[rgba(255,255,255,0.15)]!",
        )}
      />
    </div>
  );
}
