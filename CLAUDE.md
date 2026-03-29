# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run the MCP server
npm run dev        # Run with hot reload (nodemon)
npm run setup      # Interactive setup wizard — collects API key and preferences
```

No build step, no test suite. Plain JavaScript (ES Modules).

## Architecture

This is an **MCP (Model Context Protocol) server** that exposes news aggregation and NLP analysis tools to AI clients (VS Code Copilot, Claude Desktop, Cursor). It communicates over stdio using the MCP protocol.

```
AI Client (Copilot / Claude Desktop / Cursor)
        │
        │  MCP Protocol over stdio
        ▼
server/index.js          ← Entry point: validates env, registers tools, routes requests
        │
        ├── server/tools/          ← One file per MCP tool
        │   ├── getNewsDigest.js       Primary: fetch + scrape + summarize in one call
        │   ├── getLatestNews.js       Raw article metadata list (for chaining)
        │   ├── searchNews.js          Keyword/phrase search
        │   ├── compareNewsSources.js  Fetch same topic from 3 sources, compare
        │   ├── analyzeSentiment.js    AFINN-based sentiment scoring
        │   ├── extractEntities.js     People, orgs, topics via compromise NLP
        │   ├── getMyPreferences.js    Read ~/.news-hub-mcp/preferences.json
        │   └── setMyPreferences.js    Write ~/.news-hub-mcp/preferences.json
        │
        └── server/services/       ← Reusable modules, no MCP coupling
            ├── newsService.js         RapidAPI calls + normalizeArticle()
            ├── nlpService.js          sentiment + compromise libraries
            ├── scraper.js             axios + cheerio for article body text
            └── preferencesService.js  loadPreferences() / savePreferences()
```

**Request flow:**
1. AI client sends MCP tool call over stdio
2. `server/index.js` validates the tool name and dispatches to `tool.handler(args)`
3. Tool handler calls service functions and returns a plain JS object
4. `index.js` serializes the result to JSON and returns it via MCP response

## Key Details

- **ES Modules** — `"type": "module"` in package.json; use `import`/`export` throughout
- **API** — `RAPIDAPI_KEY` env var must be set; targets `real-time-news-data.p.rapidapi.com`
  - `/search` endpoint for keyword queries (`fetchNews`, `searchNews`)
  - `/topic-headlines` endpoint for category names (WORLD, TECHNOLOGY, SPORTS, etc.)
- **Response normalization** — `normalizeArticle()` in `newsService.js` maps the RapidAPI shape (`link`, `source_name`, `pubDate`) to the internal shape (`url`, `source`, `published_at`) used by all tools
- **User preferences** — stored at `~/.news-hub-mcp/preferences.json`; loaded at call time (no restart needed after update)
- **No persistence** — server is stateless; preferences file is the only disk I/O
- **Error handling** — tool handlers throw freely; `index.js` catches all errors and returns `isError: true` responses so the server never crashes mid-session
- **Tool routing** — `get_news_digest` is listed first in the registry and has "PRIMARY tool" in its description; this influences AI client tool selection

## Adding a New Tool

1. Create `server/tools/yourTool.js` — export `{ name, description, inputSchema, handler }`
2. Import it in `server/index.js` and add to the `tools` array
3. No other changes needed — tool is automatically registered and dispatched

## Setup Script

`scripts/setup.js` is a standalone Node.js CLI (not part of the MCP server). It:
- Prompts for RapidAPI key, topics, country, language
- Writes key to `.env` and `.vscode/mcp.json`
- Writes preferences to `~/.news-hub-mcp/preferences.json`

## Sensitive Files (never commit)

- `.env` — contains `RAPIDAPI_KEY`
- `.vscode/mcp.json` — gets the key injected by `npm run setup`

Both are in `.gitignore`. `config/mcp.config.json` is the safe example config (has placeholder, not a real key).
