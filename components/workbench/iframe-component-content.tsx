"use client";

import { useDemoMode } from "@/hooks/use-demo-mode";
import { cn } from "@/lib/ui/cn";
import { useWidgetBundle, WidgetIframeHost } from "@/lib/workbench/iframe";
import { useSelectedComponent, useToolInput } from "@/lib/workbench/store";
import { ComponentErrorBoundary } from "./component-error-boundary";
import { IsolatedThemeWrapper } from "./isolated-theme-wrapper";

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="text-muted-foreground text-sm">Bundling widget...</div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center">
        <div className="font-medium text-destructive text-sm">Bundle Error</div>
        <div className="mt-1 max-w-md text-muted-foreground text-xs">
          {error}
        </div>
      </div>
    </div>
  );
}

function IframeComponentRenderer() {
  const selectedComponent = useSelectedComponent();
  const isDemoMode = useDemoMode();
  const { loading, error, bundle } = useWidgetBundle(selectedComponent);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return (
    <WidgetIframeHost
      widgetBundle={bundle}
      className="h-full w-full"
      demoMode={isDemoMode}
    />
  );
}

export function IframeComponentContent({ className }: { className?: string }) {
  const toolInput = useToolInput();

  return (
    <IsolatedThemeWrapper className={cn("flex", className)}>
      <div className="h-full w-full">
        <ComponentErrorBoundary toolInput={toolInput}>
          <IframeComponentRenderer />
        </ComponentErrorBoundary>
      </div>
    </IsolatedThemeWrapper>
  );
}
