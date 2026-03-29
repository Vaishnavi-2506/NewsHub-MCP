/**
 * preferencesService.js — User Preferences Persistence Layer
 *
 * Stores and retrieves user news preferences as a JSON file on disk.
 * Preferences are saved to ~/.news-hub-mcp/preferences.json so they
 * persist across server restarts and MCP sessions.
 *
 * Preferences shape:
 *   {
 *     topics:   string[]  — e.g. ["technology", "science"]
 *     country:  string    — ISO 3166-1 alpha-2, e.g. "US", "GB", "IN"
 *     language: string    — ISO 639-1, e.g. "en", "fr", "de"
 *   }
 *
 * These values are automatically applied by get_news_digest, get_latest_news,
 * search_news, and compare_news_sources when no explicit arguments are given.
 *
 * To update preferences, users run: npm run setup
 * Or via the MCP tool: set_my_preferences
 *
 * Exports:
 *   loadPreferences()        — reads current preferences (returns defaults if none saved)
 *   savePreferences(updates) — merges updates into current preferences and saves
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PREFS_DIR = join(homedir(), ".news-hub-mcp");
const PREFS_FILE = join(PREFS_DIR, "preferences.json");

/**
 * Fallback preferences — checked in this order:
 *   1. ~/.news-hub-mcp/preferences.json  (set via npm run setup or set_my_preferences)
 *   2. Environment variables              (injected by Smithery at install time)
 *   3. Hard-coded defaults below
 */
const DEFAULT_PREFERENCES = {
  topics: process.env.PREFERRED_TOPICS
    ? process.env.PREFERRED_TOPICS.split(",").map(t => t.trim()).filter(Boolean)
    : [],
  country: process.env.PREFERRED_COUNTRY || "US",
  language: process.env.PREFERRED_LANGUAGE || "en"
};

/**
 * Reads the user's saved preferences from disk.
 * Returns default preferences if the file doesn't exist or is corrupted.
 *
 * @returns {{ topics: string[], country: string, language: string }}
 */
export function loadPreferences() {
  if (!existsSync(PREFS_FILE)) {
    return { ...DEFAULT_PREFERENCES };
  }
  try {
    return JSON.parse(readFileSync(PREFS_FILE, "utf-8"));
  } catch {
    // File exists but is malformed — fall back to defaults silently
    return { ...DEFAULT_PREFERENCES };
  }
}

/**
 * Merges the given updates into the current preferences and writes to disk.
 * Only the fields provided in `updates` are changed; others stay as-is.
 *
 * Creates ~/.news-hub-mcp/ directory if it doesn't exist yet.
 *
 * @param {Partial<{topics: string[], country: string, language: string}>} updates
 * @returns {{ topics: string[], country: string, language: string }} The full merged result
 *
 * @example
 *   savePreferences({ topics: ["science", "health"] })
 *   // country and language stay at their previous values
 */
export function savePreferences(updates) {
  if (!existsSync(PREFS_DIR)) {
    mkdirSync(PREFS_DIR, { recursive: true });
  }
  const current = loadPreferences();
  const merged = { ...DEFAULT_PREFERENCES, ...current, ...updates };
  writeFileSync(PREFS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
