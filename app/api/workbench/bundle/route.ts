import { type NextRequest, NextResponse } from "next/server";
import {
  buildComponentBundle,
  createBundleBuildOptions,
  ensureWorkbenchTempDir,
} from "@/lib/workbench/bundles/build-component-bundle";
import { getWorkbenchComponentConfig } from "@/lib/workbench/bundles/component-map";

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

  if (!componentId) {
    return NextResponse.json(
      { error: "Missing component id parameter" },
      { status: 400 },
    );
  }

  const config = getWorkbenchComponentConfig(componentId);
  if (!config) {
    return NextResponse.json(
      { error: `Unknown component: ${componentId}` },
      { status: 404 },
    );
  }

  const cached = bundleCache.get(componentId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.bundle, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache",
      },
    });
  }

  try {
    const bundle = await buildComponentBundle(process.cwd(), config, {
      minify: false,
      nodeEnv: "development",
    });

    bundleCache.set(componentId, { bundle, timestamp: Date.now() });

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
