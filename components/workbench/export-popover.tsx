"use client";

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FolderOpen,
  Loader2,
  Package,
  Terminal,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getComponent } from "@/lib/workbench/component-registry";
import { useSelectedComponent } from "@/lib/workbench/store";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ExportStatus = "idle" | "exporting" | "success" | "error";

interface CompatibilityResult {
  chatgptCompatible: boolean;
  mcpCompatible: boolean;
  hooksUsed: Array<{
    name: string;
    platform: "universal" | "chatgpt-only" | "mcp-only";
  }>;
  warnings: string[];
}

interface ExportResult {
  success: boolean;
  files?: Array<{ relativePath: string; size: number }>;
  errors?: string[];
  warnings?: string[];
  outputDir?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DemoModeContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Package className="size-4 text-primary" />
        </div>
        <div>
          <div className="font-medium">Export to Production</div>
          <div className="text-[11px] text-muted-foreground">
            Available when running locally
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Export bundles your widget as a self-contained HTML file with all
        dependencies inlined, ready to deploy to ChatGPT.
      </p>

      <div className="space-y-2">
        <div className="font-medium text-[11px] text-muted-foreground">
          To use export, run locally:
        </div>
        <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 font-mono text-[11px]">
          <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
          <span>npx mcp-app-studio</span>
        </div>
      </div>

      <a
        href="https://www.assistant-ui.com/docs/mcp-app-studio"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 font-medium text-[11px] text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View Documentation
        <ExternalLink className="size-3" />
      </a>
    </div>
  );
}

function CompatibilitySection({
  compatibility,
  isLoading,
}: {
  compatibility: CompatibilityResult | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Analyzing compatibility...
      </div>
    );
  }

  if (!compatibility) return null;

  const platformSpecificHooks = compatibility.hooksUsed.filter(
    (h) => h.platform !== "universal",
  );

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="font-medium text-[11px]">Platform Compatibility</div>
      <div className="space-y-1 text-[11px]">
        <div className="flex items-center gap-1.5">
          {compatibility.chatgptCompatible ? (
            <CheckCircle2 className="size-3 text-green-500" />
          ) : (
            <AlertTriangle className="size-3 text-amber-500" />
          )}
          <span>ChatGPT Apps</span>
          {!compatibility.chatgptCompatible && (
            <span className="text-muted-foreground">(limited)</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {compatibility.mcpCompatible ? (
            <CheckCircle2 className="size-3 text-green-500" />
          ) : (
            <AlertTriangle className="size-3 text-amber-500" />
          )}
          <span>MCP Hosts (Claude, etc.)</span>
          {!compatibility.mcpCompatible && (
            <span className="text-muted-foreground">(limited)</span>
          )}
        </div>
      </div>

      {platformSpecificHooks.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[10px] text-muted-foreground">
            Platform-specific hooks detected:
          </div>
          <div className="flex flex-wrap gap-1">
            {platformSpecificHooks.map((hook) => (
              <span
                key={hook.name}
                className={`rounded px-1.5 py-0.5 text-[10px] ${
                  hook.platform === "chatgpt-only"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}
              >
                {hook.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {compatibility.warnings.length > 0 && (
        <div className="mt-2 rounded bg-amber-500/10 p-2 text-[10px] text-amber-700 dark:text-amber-400">
          {compatibility.warnings[0]}
        </div>
      )}

      {platformSpecificHooks.length === 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          Your widget uses universal hooks and will work on both platforms.
        </p>
      )}
    </div>
  );
}

function ExportContent({ isOpen }: { isOpen: boolean }) {
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [compatibility, setCompatibility] =
    useState<CompatibilityResult | null>(null);
  const [compatibilityLoading, setCompatibilityLoading] = useState(false);
  const selectedComponentId = useSelectedComponent();
  const componentEntry = getComponent(selectedComponentId);

  useEffect(() => {
    if (!isOpen || !componentEntry) {
      setCompatibility(null);
      return;
    }

    let cancelled = false;
    setCompatibilityLoading(true);

    fetch("/api/analyze-compatibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryPoint: componentEntry.exportConfig.entryPoint,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && !data.error) {
          setCompatibility(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setCompatibilityLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, componentEntry]);

  const handleExport = useCallback(async () => {
    if (!componentEntry) {
      setResult({ success: false, errors: ["No component selected"] });
      setStatus("error");
      return;
    }

    setStatus("exporting");

    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetEntryPoint: componentEntry.exportConfig.entryPoint,
          widgetExportName: componentEntry.exportConfig.exportName,
          widgetName: componentEntry.label,
          manifest: {
            name: componentEntry.label,
            description: componentEntry.description,
            version: "1.0.0",
          },
        }),
      });

      const data: ExportResult = await response.json();
      setResult(data);
      setStatus(data.success ? "success" : "error");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      setResult({ success: false, errors: [message] });
      setStatus("error");
    }
  }, [componentEntry]);

  const handleOpenFolder = useCallback(async () => {
    try {
      await fetch("/api/open-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "export" }),
      });
    } catch {
      // Silently fail - not critical
    }
  }, []);

  const hasExported = result !== null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Export Widget</div>
        <Button
          size="sm"
          onClick={handleExport}
          disabled={status === "exporting"}
          className="h-7 gap-1.5 text-xs"
        >
          {status === "exporting" ? (
            <>
              <Loader2 className="size-3 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="size-3" />
              {hasExported ? "Re-export" : "Export"}
            </>
          )}
        </Button>
      </div>

      {!hasExported && status !== "exporting" && componentEntry && (
        <>
          <p className="text-[11px] text-muted-foreground">
            Bundle <span className="font-medium">{componentEntry.label}</span>{" "}
            for production deployment.
          </p>
          <CompatibilitySection
            compatibility={compatibility}
            isLoading={compatibilityLoading}
          />
        </>
      )}

      {result?.success && result.files && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3.5" />
            <span>Export successful</span>
          </div>
          <button
            onClick={handleOpenFolder}
            className="flex w-full items-center justify-between rounded bg-muted px-2 py-1.5 font-mono text-[11px] transition-colors hover:bg-muted/80"
          >
            <span>./export/</span>
            <FolderOpen className="size-3.5 text-muted-foreground" />
          </button>
          <div className="space-y-0.5 text-[11px]">
            {result.files.map((f) => (
              <div
                key={f.relativePath}
                className="flex justify-between gap-3 text-muted-foreground"
              >
                <span className="truncate">{f.relativePath}</span>
                <span className="shrink-0 tabular-nums">
                  {formatBytes(f.size)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t pt-2 text-[11px] text-muted-foreground">
            Total:{" "}
            {formatBytes(result.files.reduce((sum, f) => sum + f.size, 0))}
          </div>
        </div>
      )}

      {result && !result.success && (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-destructive">
            <AlertCircle className="size-3.5" />
            <span>Export failed</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {result.errors?.[0] ?? "Unknown error"}
          </p>
        </div>
      )}
    </div>
  );
}

export function ExportPopover() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 rounded-md px-2.5 font-medium text-xs"
        >
          <Download className="size-3.5" />
          Export
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 text-xs">
        {isDemoMode ? <DemoModeContent /> : <ExportContent isOpen={isOpen} />}
      </PopoverContent>
    </Popover>
  );
}
