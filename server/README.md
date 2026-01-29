# MCP Server

MCP server for your MCP app.

## Quick Start

```bash
npm install
npm run dev
```

Server runs at `http://localhost:3001/mcp`

## Test with MCP Inspector

```bash
npm run inspect
```

## Deploy

### Vercel

```bash
vercel deploy
```

### Manual

1. Build: `npm run build`
2. Start: `npm start`

## Tools

- **example_tool**: An example tool for your MCP app

## Adding New Tools

1. Create a new handler in `src/tools/`
2. Register it in `src/index.ts`
3. Update your widget to call the tool

## Security

### CORS Configuration

By default, this server allows requests from any origin (`Access-Control-Allow-Origin: *`).

**For production**, restrict CORS to your widget's domain by setting the `CORS_ORIGIN` environment variable:

```bash
CORS_ORIGIN=https://your-widget-domain.com
```
