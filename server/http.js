/**
 * http.js — HTTP Server Entry Point (StreamableHTTP transport)
 *
 * Serves the News Hub MCP tools over HTTP using the StreamableHTTP transport
 * introduced in MCP SDK v1.x. This is the required transport for Smithery
 * and other cloud-hosted MCP deployments.
 *
 * Endpoints:
 *   POST /mcp                          — main MCP endpoint (initialize + tool calls)
 *   GET  /mcp                          — SSE stream for server-to-client events
 *   DELETE /mcp                        — close a session
 *   GET  /.well-known/mcp/server-card.json — Smithery discovery endpoint
 *   GET  /health                       — deployment health check
 *
 * Usage:
 *   npm run start:http        (production)
 *   npm run dev:http          (development with hot reload)
 *
 * Environment variables:
 *   RAPIDAPI_KEY        — RapidAPI key (can also be passed via query param for Smithery)
 *   PREFERRED_TOPICS    — comma-separated topics (optional, from Smithery config)
 *   PREFERRED_COUNTRY   — country code (optional)
 *   PREFERRED_LANGUAGE  — language code (optional)
 *   PORT                — defaults to 3000
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });

// Warn but don't crash — Smithery users supply their key via query params
if (!process.env.RAPIDAPI_KEY) {
  console.warn("[news-hub-mcp] RAPIDAPI_KEY not set — expecting it via query params (Smithery).");
}

import express from "express";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Tool imports ──────────────────────────────────────────────────────────────
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

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// CORS — required for Smithery and browser-based MCP clients
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, mcp-session-id");
  if (req.method === "OPTIONS") { res.sendStatus(200); return; }
  next();
});

// Active sessions: sessionId → transport
const sessions = {};

/**
 * POST /mcp — handles initialize and all tool call requests.
 * On first contact (no session ID), creates a new session.
 * On subsequent calls, routes to the existing session's transport.
 */
app.post("/mcp", async (req, res) => {
  // Apply API key from query params (Smithery) if not set in env
  if (req.query.rapidApiKey) process.env.RAPIDAPI_KEY = req.query.rapidApiKey;
  if (req.query.preferredTopics) process.env.PREFERRED_TOPICS = req.query.preferredTopics;
  if (req.query.country) process.env.PREFERRED_COUNTRY = req.query.country;
  if (req.query.language) process.env.PREFERRED_LANGUAGE = req.query.language;

  const sessionId = req.headers["mcp-session-id"];

  if (sessionId && sessions[sessionId]) {
    // Existing session — route to its transport
    await sessions[sessionId].handleRequest(req, res, req.body);
    return;
  }

  // New session
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (id) => {
      sessions[id] = transport;
    }
  });

  transport.onclose = () => {
    if (transport.sessionId) delete sessions[transport.sessionId];
  };

  const server = createMCPServer();
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

/**
 * GET /mcp — SSE stream for server-to-client notifications.
 */
app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  const transport = sessions[sessionId];
  if (!transport) {
    res.status(404).json({ error: "Session not found. POST to /mcp first." });
    return;
  }
  await transport.handleRequest(req, res);
});

/**
 * DELETE /mcp — close a session cleanly.
 */
app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (sessions[sessionId]) {
    await sessions[sessionId].close();
    delete sessions[sessionId];
  }
  res.status(200).json({ message: "Session closed." });
});

/**
 * GET /.well-known/mcp/server-card.json
 * Smithery reads this to discover the server without scanning.
 */
app.get("/.well-known/mcp/server-card.json", (req, res) => {
  const base = `${req.protocol}://${req.headers.host}`;
  res.json({
    name: "news-hub-mcp",
    version: "2.0.0",
    description: "Real-time news aggregation, search, NLP analysis, and personalized preferences via MCP.",
    connections: [
      { type: "http", url: `${base}/mcp` }
    ]
  });
});

/**
 * GET /health — deployment health check for Railway.
 */
app.get("/health", (_, res) => {
  res.json({ status: "ok", server: "news-hub-mcp", version: "2.0.0" });
});

app.listen(PORT, () => {
  console.log(`[news-hub-mcp] HTTP server running on port ${PORT}`);
  console.log(`[news-hub-mcp] MCP endpoint: http://localhost:${PORT}/mcp`);
});
