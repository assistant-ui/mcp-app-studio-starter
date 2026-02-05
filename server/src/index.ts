import fs from "node:fs";
import { createServer } from "node:http";
import net from "node:net";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { exampleToolHandler } from "./tools/example-tool.js";

const APP_NAME = "My App";

const WIDGET_HTML = `<!DOCTYPE html>
<html>
<head><title>${APP_NAME}</title></head>
<body>
  <div id="root"></div>
  <script src="widget.js"></script>
</body>
</html>`;

function createAppServer() {
  const server = new McpServer({
    name: APP_NAME,
    version: "1.0.0",
  });

  server.registerResource("widget", "ui://widget/main.html", {}, async () => ({
    contents: [
      {
        uri: "ui://widget/main.html",
        mimeType: "text/html+skybridge",
        text: WIDGET_HTML,
        _meta: {
          "openai/widgetPrefersBorder": true,
        },
      },
    ],
  }));

  server.registerTool(
    "example_tool",
    {
      title: "Example Tool",
      description: "An example tool for your MCP app",
      inputSchema: {
        query: z.string().describe("The search query"),
      },
      _meta: {
        ui: {
          resourceUri: "ui://widget/main.html",
        },
        "openai/widgetAccessible": true,
        "openai/toolInvocation/invoking": "Processing...",
        "openai/toolInvocation/invoked": "Done",
      },
    },
    exampleToolHandler,
  );

  return server;
}

const MCP_PATH = "/mcp";
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || "*";

async function isPortAvailable(port: number): Promise<boolean> {
  return await new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.unref();

    server.once("error", () => resolve(false));
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

async function findAvailablePort(
  startPort: number,
  opts?: { maxTries?: number },
): Promise<number> {
  const maxTries = opts?.maxTries ?? 20;
  for (let i = 0; i < maxTries; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) return port;
  }

  throw new Error(
    `No available port found starting at ${startPort} (tried ${maxTries} ports).`,
  );
}

async function main() {
  const REQUESTED_PORT = Number(process.env.PORT ?? "3001") || 3001;
  let port = await findAvailablePort(REQUESTED_PORT);

  if (port !== REQUESTED_PORT) {
    console.log(
      `Port ${REQUESTED_PORT} is in use. Falling back to port ${port} for the MCP server.`,
    );
  }

  const httpServer = createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (req.method === "OPTIONS" && url.pathname === MCP_PATH) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "POST, GET, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "content-type, mcp-session-id",
        "Access-Control-Expose-Headers": "Mcp-Session-Id",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end(`${APP_NAME} MCP server`);
      return;
    }

    const MCP_METHODS = new Set(["POST", "GET", "DELETE"]);
    if (url.pathname === MCP_PATH && req.method && MCP_METHODS.has(req.method)) {
      res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
      res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");

      const server = createAppServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      res.on("close", () => {
        transport.close();
        server.close();
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("Error handling MCP request:", error);
        if (!res.headersSent) {
          res.writeHead(500).end("Internal server error");
        }
      }
      return;
    }

    res.writeHead(404).end("Not Found");
  });

  function onListening() {
    const url = `http://localhost:${port}${MCP_PATH}`;
    console.log(`${APP_NAME} MCP server listening on ${url}`);

    // Helpful for tooling (e.g. `npm run inspect`) when the port is auto-selected.
    try {
      fs.writeFileSync(path.join(process.cwd(), ".mcp-port"), `${port}\n`, "utf-8");
    } catch {
      // ignore
    }
  }

  httpServer.on("error", async (err) => {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EADDRINUSE") {
      try {
        const nextPort = await findAvailablePort(port + 1);
        console.log(
          `Port ${port} became unavailable. Falling back to port ${nextPort} for the MCP server.`,
        );
        port = nextPort;
        httpServer.listen(port, onListening);
        return;
      } catch (inner) {
        console.error(
          "Failed to find an available port for the MCP server:",
          inner,
        );
      }
    } else {
      console.error("MCP server error:", err);
    }

    process.exit(1);
  });

  httpServer.listen(port, onListening);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
