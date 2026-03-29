/**
 * searchNews.js — Keyword Search Tool
 *
 * Searches for news articles matching a specific keyword query.
 * Returns raw article metadata (title, URL, source, date, description).
 *
 * Difference from get_latest_news:
 *   get_latest_news → topic/category browsing (broad)
 *   search_news     → precise keyword search (specific names, events, phrases)
 *
 * Example use cases:
 *   "Find articles mentioning Elon Musk"
 *   "Search for news about the Apple earnings report"
 *   "Find recent articles on climate summit negotiations"
 *
 * Preference integration:
 *   Uses saved country and language to localize results,
 *   but always requires an explicit query string.
 */

import { searchNews } from "../services/newsService.js";
import { normalizeArticle } from "../services/newsService.js";
import { loadPreferences } from "../services/preferencesService.js";

export const searchNewsTool = {
  name: "search_news",
  description: "Search and return raw article metadata for a specific query. Use this ONLY when the user wants to browse or filter articles by keyword. For summaries or digests, use get_news_digest instead.",

  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query — a keyword, phrase, person name, or event"
      },
      limit: {
        type: "number",
        description: "Number of articles to return (default: 5, max: 50)"
      }
    },
    required: ["query"]
  },

  async handler({ query, limit = 5 }) {
    // Apply saved country/language preferences for result localization
    const { country, language } = loadPreferences();
    const articles = await searchNews(query, limit, country, language);
    return {
      articles: articles.map(normalizeArticle)
    };
  }
};
