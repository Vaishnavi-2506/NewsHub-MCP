/**
 * getMyPreferences.js — View Saved Preferences Tool
 *
 * Returns the user's currently saved news preferences from disk.
 * Preferences are stored at ~/.news-hub-mcp/preferences.json and
 * control the default topic, country, and language used by all news tools
 * when no explicit arguments are provided.
 *
 * Returns defaults ({ topics: [], country: "US", language: "en" }) if
 * no preferences have been set yet.
 *
 * Related:
 *   set_my_preferences — to update preferences
 *   npm run setup      — interactive CLI to configure preferences
 */

import { loadPreferences } from "../services/preferencesService.js";

export const getMyPreferences = {
  name: "get_my_preferences",
  description: "Get your saved news preferences (topics, country, language). These are applied automatically when fetching news without an explicit topic.",

  inputSchema: {
    type: "object",
    properties: {}
  },

  async handler() {
    const prefs = loadPreferences();
    return {
      preferences: prefs,
      note: "Use set_my_preferences to update these, or run: npm run setup"
    };
  }
};
