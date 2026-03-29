# News Hub MCP

An MCP (Model Context Protocol) server that gives AI assistants real-time news fetching, search, NLP analysis, and personalized news preferences — all accessible through natural language.

Works with VS Code Copilot, Claude Desktop, Cursor, Windsurf, and any other MCP-compatible AI client.

---

## What It Does

Ask your AI assistant things like:
- *"What's happening in the world today?"* → fetches, scrapes, and summarizes top stories
- *"How are different outlets covering the Fed rate decision?"* → side-by-side source comparison
- *"Search for Tesla news and analyze the sentiment"* → tool chaining across search + NLP
- *"Set my preferences to technology news from India"* → saved, applied to all future requests

---

## Prerequisites

- Node.js 18 or higher
- A free RapidAPI account with the **Real-Time News Data** API subscribed
  - Sign up at [rapidapi.com](https://rapidapi.com)
  - Search for **"Real-Time News Data"** and subscribe to the free tier (150 req/month)
  - Copy your `x-rapidapi-key` from the Endpoints tab

---

## Installation

```bash
git clone https://github.com/your-username/news-hub-mcp.git
cd news-hub-mcp
npm install
npm run setup
```

`npm run setup` is an interactive wizard that:
- Saves your RapidAPI key to `.env` and `.vscode/mcp.json`
- Asks for your preferred topics, country, and language
- Stores preferences at `~/.news-hub-mcp/preferences.json`

---

## MCP Client Configuration

### VS Code Copilot

Add to `.vscode/mcp.json` in your workspace (created automatically by `npm run setup`):

```json
{
  "servers": {
    "news-hub-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["server/index.js"],
      "cwd": "/absolute/path/to/news-hub-mcp",
      "env": {
        "RAPIDAPI_KEY": "your_key_here"
      }
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "news-hub-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/news-hub-mcp/server/index.js"],
      "env": {
        "RAPIDAPI_KEY": "your_key_here"
      }
    }
  }
}
```

---

## Available Tools

| Tool | Description |
|---|---|
| `get_news_digest` | **Primary tool.** Fetches, scrapes, and summarizes news in one call. Use for any general news question. |
| `get_latest_news` | Returns raw article metadata (titles, URLs, sources). Use when the user wants a list of links. |
| `search_news` | Searches articles by keyword or phrase. Use for specific names, events, or topics. |
| `compare_news_sources` | Fetches the same topic from 3 sources and returns a side-by-side summary of each. |
| `analyze_sentiment` | Scores text as positive, negative, or neutral using AFINN scoring. |
| `extract_entities` | Extracts people, organizations, and topics from text. |
| `get_my_preferences` | Returns your currently saved news preferences. |
| `set_my_preferences` | Updates your preferences (topics, country, language). Changes apply immediately. |

---

## Tool Chaining

The AI client can call tools in sequence. Example chains:

**Sentiment analysis on news:**
> "Get me AI news and analyze the overall sentiment"
1. `get_latest_news` (topic: AI) → returns article descriptions
2. `analyze_sentiment` (text: combined descriptions) → returns score

**Entity extraction from search:**
> "Search for Tesla news and extract key people and organizations"
1. `search_news` (query: Tesla) → returns articles
2. `extract_entities` (text: combined descriptions) → returns entities

---

## User Preferences

Preferences are stored at `~/.news-hub-mcp/preferences.json` and persist across sessions.

**To set via wizard:**
```bash
npm run setup
```

**To set via AI:**
> "Set my news preferences to technology and science, country US, language English"

**Preference fields:**
| Field | Description | Example |
|---|---|---|
| `topics` | Preferred topics, auto-applied when no topic given | `["technology", "science"]` |
| `country` | ISO 3166-1 alpha-2 country code | `"US"`, `"GB"`, `"IN"` |
| `language` | ISO 639-1 language code | `"en"`, `"fr"`, `"de"` |

---

## Development

```bash
npm start        # Run the server
npm run dev      # Run with hot reload (nodemon)
npm run setup    # Re-run the setup wizard
```

---

## Architecture

```
AI Client (Copilot / Claude Desktop / Cursor)
        │
        │  MCP Protocol over stdio
        ▼
server/index.js          ← Entry point: validates env, registers tools, routes requests
        │
        ├── server/tools/          ← One file per MCP tool
        │   ├── getNewsDigest.js       Primary: fetch + scrape + summarize
        │   ├── getLatestNews.js       Raw article list
        │   ├── searchNews.js          Keyword search
        │   ├── compareNewsSources.js  Multi-source comparison
        │   ├── analyzeSentiment.js    NLP sentiment
        │   ├── extractEntities.js     NLP entity extraction
        │   ├── getMyPreferences.js    Read preferences
        │   └── setMyPreferences.js    Write preferences
        │
        └── server/services/       ← Reusable modules (no MCP coupling)
            ├── newsService.js         RapidAPI HTTP calls + response normalization
            ├── nlpService.js          sentiment + compromise NLP libraries
            ├── scraper.js             axios + cheerio article scraping
            └── preferencesService.js  ~/.news-hub-mcp/preferences.json read/write
```

---

## License

MIT
