/**
 * getLatestNews.js — Raw Article Listing Tool
 *
 * Returns a structured list of article metadata (title, URL, source, date, description)
 * WITHOUT scraping or summarizing. Use this when the user explicitly wants to see
 * a list of articles or links rather than a summarized digest.
 *
 * Difference from get_news_digest:
 *   get_news_digest  → fetch + scrape + summarize (finished answer)
 *   get_latest_news  → fetch only (raw data for further processing)
 *
 * Also useful for tool chaining: the AI can call this first to get article metadata,
 * then pass the results to analyze_sentiment or extract_entities for deeper analysis.
 *
 * Preference integration:
 *   If no topic is given, uses the user's first saved preference topic.
 *   Falls back to "top news" if no preferences are configured.
 */

import { fetchNews, fetchTopicHeadlines, normalizeArticle } from "../services/newsService.js";
import { loadPreferences } from "../services/preferencesService.js";

/** Category names that map to the /topic-headlines API endpoint */
const TOPIC_CATEGORIES = new Set([
  "WORLD", "NATIONAL", "BUSINESS", "TECHNOLOGY",
  "ENTERTAINMENT", "SPORTS", "SCIENCE", "HEALTH"
]);

export const getLatestNews = {
  name: "get_latest_news",
  description: "Fetch raw news article metadata (titles, URLs, sources) without summarization. Use this ONLY when the user explicitly wants a list of article links or sources. For any general news question, use get_news_digest instead.",

  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic or keyword to search for. Omit to use your saved preferences."
      },
      limit: {
        type: "number",
        description: "Number of articles to fetch (default: 5, max: 50)"
      }
    }
  },

  async handler({ topic, limit = 5 } = {}) {
    const prefs = loadPreferences();

    // Resolve topic: explicit arg → first saved preference → global fallback
    const resolvedTopic = topic || prefs.topics[0] || "top news";
    const { country, language } = prefs;

    // Use topic-headlines endpoint for known categories, search for everything else
    let articles;
    if (TOPIC_CATEGORIES.has(resolvedTopic.toUpperCase())) {
      articles = await fetchTopicHeadlines(resolvedTopic, limit, country, language);
    } else {
      articles = await fetchNews(resolvedTopic, limit, country, language);
    }

    return {
      topic: resolvedTopic,
      articles: articles.map(normalizeArticle)
    };
  }
};
