#!/usr/bin/env node
/**
 * News Hub MCP — Interactive Setup
 * Collects RapidAPI key and news preferences, then saves them locally.
 * Run: npm run setup
 */

import { createInterface } from "readline/promises";
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PREFS_DIR = join(homedir(), ".news-hub-mcp");
const PREFS_FILE = join(PREFS_DIR, "preferences.json");
const ENV_FILE = join(ROOT, ".env");
const MCP_JSON = join(ROOT, ".vscode", "mcp.json");

const rl = createInterface({ input: process.stdin, output: process.stdout });

async function ask(question, defaultValue = "") {
  const hint = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`  ${question}${hint}: `);
  return answer.trim() || defaultValue;
}

async function askList(question, defaultValues = []) {
  const hint = defaultValues.length ? ` [${defaultValues.join(", ")}]` : "";
  const answer = await rl.question(`  ${question}${hint}: `);
  if (!answer.trim()) return defaultValues;
  return answer.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
}

function loadExistingPrefs() {
  if (!existsSync(PREFS_FILE)) return {};
  try { return JSON.parse(readFileSync(PREFS_FILE, "utf-8")); } catch { return {}; }
}

function loadExistingKey() {
  if (!existsSync(ENV_FILE)) return "";
  const match = readFileSync(ENV_FILE, "utf-8").match(/^RAPIDAPI_KEY=(.+)$/m);
  return match ? match[1].trim() : "";
}

function separator() {
  console.log("  " + "─".repeat(50));
}

async function main() {
  console.log("\n  ╔══════════════════════════════════════╗");
  console.log("  ║       News Hub MCP — Setup           ║");
  console.log("  ╚══════════════════════════════════════╝\n");
  console.log("  This wizard configures your API key and news preferences.");
  console.log("  Settings are saved locally and never shared.\n");

  const existingPrefs = loadExistingPrefs();
  const existingKey = loadExistingKey();

  if (existingKey || existingPrefs.topics?.length) {
    console.log("  ✓ Existing configuration found. Press Enter to keep current values.\n");
  }

  // ── Step 1: API Key ──────────────────────────────────────────────────────
  separator();
  console.log("  Step 1/3 — RapidAPI Key\n");
  console.log("  Get a free key at rapidapi.com → search 'Real-Time News Data'\n");

  const apiKey = await ask("Paste your RapidAPI key", existingKey);

  if (!apiKey) {
    console.log("\n  ✗ API key is required. Run npm run setup again when you have one.\n");
    rl.close();
    process.exit(1);
  }

  // ── Step 2: Topics ───────────────────────────────────────────────────────
  separator();
  console.log("  Step 2/3 — Preferred Topics\n");
  console.log("  Comma-separated list of topics you care about.");
  console.log("  Examples: technology, science, sports, business, health\n");
  console.log("  Or use category names: TECHNOLOGY, SPORTS, WORLD, SCIENCE,");
  console.log("  HEALTH, BUSINESS, ENTERTAINMENT, NATIONAL\n");

  const topics = await askList("Your topics", existingPrefs.topics || []);

  // ── Step 3: Region ───────────────────────────────────────────────────────
  separator();
  console.log("  Step 3/3 — Region & Language\n");
  console.log("  Country code examples: US, GB, IN, AU, CA, DE, FR");
  console.log("  Language code examples: en, fr, de, es, hi, ar\n");

  const country = await ask("Country code", existingPrefs.country || "US");
  const language = await ask("Language code", existingPrefs.language || "en");

  rl.close();

  // ── Save ─────────────────────────────────────────────────────────────────
  separator();
  console.log("\n  Saving configuration...\n");

  // .env
  writeFileSync(ENV_FILE,
    `# RapidAPI key — from rapidapi.com (Real-Time News Data)\nRAPIDAPI_KEY=${apiKey}\n`
  );
  console.log(`  ✓ API key saved to .env`);

  // ~/.news-hub-mcp/preferences.json
  if (!existsSync(PREFS_DIR)) mkdirSync(PREFS_DIR, { recursive: true });
  writeFileSync(PREFS_FILE, JSON.stringify({ topics, country, language }, null, 2));
  console.log(`  ✓ Preferences saved to ${PREFS_FILE}`);

  // .vscode/mcp.json — update env block with the key
  if (existsSync(MCP_JSON)) {
    try {
      const config = JSON.parse(readFileSync(MCP_JSON, "utf-8"));
      const serverKey = Object.keys(config.servers || {})[0];
      if (serverKey) {
        config.servers[serverKey].env = { ...config.servers[serverKey].env, RAPIDAPI_KEY: apiKey };
        writeFileSync(MCP_JSON, JSON.stringify(config, null, 2) + "\n");
        console.log("  ✓ API key injected into .vscode/mcp.json");
      }
    } catch {
      console.log("  ⚠ Could not update .vscode/mcp.json — add RAPIDAPI_KEY to the env block manually.");
    }
  }

  console.log("\n  ✓ Setup complete!\n");
  console.log("  Next steps:");
  console.log("  1. Restart the MCP server in VS Code (MCP panel → Restart)");
  console.log("  2. Ask your AI: 'what is happening in the world?'\n");
  separator();
  console.log();
}

main().catch(err => {
  console.error("\n  Setup failed:", err.message, "\n");
  rl.close();
  process.exit(1);
});
