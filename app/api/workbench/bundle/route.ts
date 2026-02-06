import { type NextRequest, NextResponse } from "next/server";
import {
  buildComponentBundle,
  buildDemoBundle,
  createBundleBuildOptions,
  ensureWorkbenchTempDir,
} from "@/lib/workbench/bundles/build-component-bundle";
import { getWorkbenchComponentConfig } from "@/lib/workbench/bundles/component-map";
import { getWorkbenchDemoComponentConfig } from "@/lib/workbench/bundles/demo-component-map";

export const runtime = "nodejs";
export { createBundleBuildOptions, ensureWorkbenchTempDir };

const bundleCache = new Map<string, { bundle: string; timestamp: number }>();
const CACHE_TTL = 5000;

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      {
        error:
          "This endpoint is only available in development. Run the workbench locally with `npm run dev`.",
      },
      { status: 403 },
    );
  }

  const componentId = request.nextUrl.searchParams.get("id");
  const isDemoMode = request.nextUrl.searchParams.get("demo") === "true";

  if (!componentId) {
    return NextResponse.json(
      { error: "Missing component id parameter" },
      { status: 400 },
    );
  }

  const config = isDemoMode
    ? getWorkbenchDemoComponentConfig(componentId)
    : getWorkbenchComponentConfig(componentId);
  if (!config) {
    return NextResponse.json(
      {
        error: `Unknown ${isDemoMode ? "demo " : ""}component: ${componentId}`,
      },
      { status: 404 },
    );
  }

  const cacheKey = `${isDemoMode ? "demo" : "workbench"}:${componentId}`;
  const cached = bundleCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  }

  try {
    const bundleBuilder = isDemoMode ? buildDemoBundle : buildComponentBundle;
    const bundle = await bundleBuilder(process.cwd(), config, {
      minify: false,
      nodeEnv: "development",
    });

    bundleCache.set(cacheKey, { bundle, timestamp: Date.now() });

    return new NextResponse(bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Bundle failed: ${message}` },
      { status: 500 },
    );
  }
}
