/**
 * index.js — MCP Server Entry Point
 *
 * Bootstraps the News Hub MCP server and exposes all tools to AI clients
 * (VS Code Copilot, Claude Desktop, Cursor, etc.) over the MCP stdio protocol.
 *
 * Responsibilities:
 *   1. Validate required environment variables before anything starts
 *   2. Register all tools with their name, description, and input schema
 *   3. Route incoming CallToolRequests to the correct tool handler
 *   4. Catch handler errors and return structured error responses
 *      (so the server never crashes mid-session)
 *
 * Adding a new tool:
 *   1. Create server/tools/yourTool.js exporting { name, description, inputSchema, handler }
 *   2. Import it here
 *   3. Add it to the `tools` array — that's it, no other changes needed
 *
 * Transport: StdioServerTransport (reads from stdin, writes to stdout)
 * Protocol:  Model Context Protocol (MCP) v0.5
 */

import dotenv from "dotenv";
dotenv.config({ quiet: true });

// ── Environment validation ────────────────────────────────────────────────────
// Fail fast with a clear message rather than a cryptic 403 later
if (!process.env.RAPIDAPI_KEY) {
  console.error("[news-hub-mcp] Missing required environment variable: RAPIDAPI_KEY");
  console.error("[news-hub-mcp] Run 'npm run setup' to configure your API key.");
  process.exit(1);
}

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// ── Tool imports ──────────────────────────────────────────────────────────────
// Listed in priority order — get_news_digest first so it appears first in
// the tool list shown to AI clients (influences routing preference)
import { getNewsDigest } from "./tools/getNewsDigest.js";
import { getLatestNews } from "./tools/getLatestNews.js";
import { searchNewsTool } from "./tools/searchNews.js";
import { compareNewsSources } from "./tools/compareNewsSources.js";
import { analyzeSentiment } from "./tools/analyzeSentiment.js";
import { extractEntitiesTool } from "./tools/extractEntities.js";
import { getMyPreferences } from "./tools/getMyPreferences.js";
import { setMyPreferences } from "./tools/setMyPreferences.js";

// ── Tool registry ─────────────────────────────────────────────────────────────
// All registered tools are automatically exposed via ListToolsRequestSchema.
// To disable a tool temporarily, remove it from this array.
const tools = [
  getNewsDigest,       // Primary: fetch + scrape + summarize
  getLatestNews,       // Raw article metadata list
  searchNewsTool,      // Keyword search
  compareNewsSources,  // Multi-source comparison
  analyzeSentiment,    // NLP: sentiment scoring
  extractEntitiesTool, // NLP: people, orgs, topics
  getMyPreferences,    // Preferences: read
  setMyPreferences     // Preferences: write
];

// ── Server setup ──────────────────────────────────────────────────────────────
const server = new Server(
  { name: "news-hub-mcp", version: "2.0.0" },
  { capabilities: { tools: {} } }
);

/**
 * ListToolsRequest — returns all registered tools with their schemas.
 * Called by the AI client on startup to discover available tools.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }))
}));

/**
 * CallToolRequest — dispatches a tool call to the correct handler.
 *
 * Error handling strategy:
 *   - Unknown tool name  → return isError response (don't throw)
 *   - Handler exception  → catch and return isError response (don't crash server)
 *
 * This ensures the MCP session stays alive even if a single tool call fails
 * (e.g. API down, bad input, scraping timeout).
 */
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

// ── Start ─────────────────────────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
