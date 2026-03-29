/**
 * setMyPreferences.js — Update Preferences Tool
 *
 * Saves the user's news preferences to ~/.news-hub-mcp/preferences.json.
 * Only the fields provided are updated — unspecified fields keep their
 * current values (partial update / patch semantics).
 *
 * Preferences are immediately applied to all subsequent news tool calls
 * without restarting the server.
 *
 * Fields:
 *   topics   — list of preferred topics, e.g. ["technology", "science"]
 *              Can also be category names: TECHNOLOGY, SPORTS, WORLD, etc.
 *   country  — ISO 3166-1 alpha-2 code, e.g. "US", "GB", "IN", "AU"
 *   language — ISO 639-1 code, e.g. "en", "fr", "de", "hi"
 *
 * Example prompt that triggers this tool:
 *   "Set my preferences to technology and AI news from India in English"
 *   → saves { topics: ["technology", "AI"], country: "IN", language: "en" }
 *
 * Alternative: run `npm run setup` for an interactive setup wizard.
 */

import { savePreferences } from "../services/preferencesService.js";

export const setMyPreferences = {
  name: "set_my_preferences",
  description: "Update your news preferences. Only the fields you provide will change — others stay as-is. Preferences are applied automatically to all news tools.",

  inputSchema: {
    type: "object",
    properties: {
      topics: {
        type: "array",
        items: { type: "string" },
        description: "Preferred topics, e.g. ['technology', 'science']. Used automatically when no topic is specified."
      },
      country: {
        type: "string",
        description: "2-letter country code for news region, e.g. 'US', 'GB', 'IN', 'AU'."
      },
      language: {
        type: "string",
        description: "2-letter language code, e.g. 'en', 'fr', 'de', 'es'."
      }
    }
  },

  async handler(args) {
    const updated = savePreferences(args);
    return {
      message: "Preferences saved successfully.",
      preferences: updated
    };
  }
};
