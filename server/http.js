/**
 * http.js — HTTP/SSE Server Entry Point
 *
 * Serves the same News Hub MCP tools over HTTP using Server-Sent Events (SSE).
 * This transport is required for cloud deployments (Railway, Render, etc.)
 * and allows Smithery and other remote MCP clients to connect via HTTPS URL.
 *
 * Endpoints:
 *   GET  /sse       — client connects here to open the SSE stream
 *   POST /messages  — client sends tool call requests here
 *   GET  /health    — simple health check for deployment platforms
 *
 * Usage:
 *   npm run start:http        (production)
 *   npm run dev:http          (development with hot reload)
 *
 * Environment variables:
 *   RAPIDAPI_KEY   — required, your RapidAPI key
 *   PORT           — optional, defaults to 3000
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });

// ── Environment validation ────────────────────────────────────────────────────
if (!process.env.RAPIDAPI_KEY) {
  console.error("[news-hub-mcp] Missing required environment variable: RAPIDAPI_KEY");
  console.error("[news-hub-mcp] Set it in your environment or .env file.");
  process.exit(1);
}

import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Tool imports (same as stdio server) ──────────────────────────────────────
import { getNewsDigest } from "./tools/getNewsDigest.js";
import { getLatestNews } from "./tools/getLatestNews.js";
import { searchNewsTool } from "./tools/searchNews.js";
import { compareNewsSources } from "./tools/compareNewsSources.js";
import { analyzeSentiment } from "./tools/analyzeSentiment.js";
import { extractEntitiesTool } from "./tools/extractEntities.js";
import { getMyPreferences } from "./tools/getMyPreferences.js";
import { setMyPreferences } from "./tools/setMyPreferences.js";

const tools = [
  getNewsDigest,
  getLatestNews,
  searchNewsTool,
  compareNewsSources,
  analyzeSentiment,
  extractEntitiesTool,
  getMyPreferences,
  setMyPreferences
];

// ── MCP server factory ────────────────────────────────────────────────────────
// A new MCP Server instance is created per SSE connection so each client
// gets its own isolated session.
function createMCPServer() {
  const server = new Server(
    { name: "news-hub-mcp", version: "2.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const tool = tools.find((t) => t.name === name);

    if (!tool) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
        isError: true
      };
    }

    try {
      const result = await tool.handler(args || {});
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: err.message }) }],
        isError: true
      };
    }
  });

  return server;
}

// ── Express HTTP server ───────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

// CORS — required for Smithery and browser-based MCP clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

// Track active SSE transports so POST /messages can route to the right session
const activeTransports = {};

/**
 * GET /sse
 * Client opens this endpoint to establish an SSE connection.
 * Smithery and other MCP clients connect here.
 */
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const server = createMCPServer();

  // Store transport by session ID so /messages can find it
  activeTransports[transport.sessionId] = transport;

  // Clean up when client disconnects
  res.on("close", () => {
    delete activeTransports[transport.sessionId];
  });

  await server.connect(transport);
});

/**
 * POST /messages
 * Client sends MCP tool call requests here.
 * Must include sessionId from the SSE handshake.
 */
app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = activeTransports[sessionId];

  if (!transport) {
    res.status(404).json({ error: "Session not found. Connect to /sse first." });
    return;
  }

  await transport.handlePostMessage(req, res);
});

/**
 * GET /.well-known/mcp/server-card.json
 * Required by Smithery to discover server metadata without scanning.
 * See: https://smithery.ai/docs/build/publish#troubleshooting
 */
app.get("/.well-known/mcp/server-card.json", (_, res) => {
  res.json({
    name: "news-hub-mcp",
    version: "2.0.0",
    description: "Real-time news aggregation, search, NLP analysis, and personalized preferences via MCP.",
    connections: [
      {
        type: "sse",
        url: "/sse"
      }
    ]
  });
});

/**
 * GET /health
 * Used by Railway/Render to verify the service is running.
 */
app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "news-hub-mcp", version: "2.0.0" });
});

app.listen(PORT, () => {
  console.log(`[news-hub-mcp] HTTP server running on port ${PORT}`);
  console.log(`[news-hub-mcp] SSE endpoint: http://localhost:${PORT}/sse`);
});
