/**
 * getNewsDigest.js — Primary News Tool
 *
 * The main entry point for any general news request from the user.
 * Performs a full pipeline in a single tool call:
 *   1. Fetch articles from RapidAPI (by topic or user preferences)
 *   2. Scrape full body text from each article URL in parallel
 *   3. Summarize all content into a concise human-readable digest
 *
 * When to use (AI routing guidance — embedded in description):
 *   "what is happening", "latest news", "tell me about X",
 *   "world news", "summarize news", "give me a digest"
 *
 * When NOT to use:
 *   - User wants raw links only → use get_latest_news
 *   - User wants to search a specific keyword → use search_news
 *
 * Preference integration:
 *   If no topic is given, falls back to the user's first saved topic.
 *   If no preferences are saved either, defaults to "top news" and
 *   includes a tip in the response prompting the user to set preferences.
 */

import { fetchNews, fetchTopicHeadlines, normalizeArticle } from "../services/newsService.js";
import { scrapeArticle } from "../services/scraper.js";
import { loadPreferences } from "../services/preferencesService.js";

/**
 * Category names supported by the /topic-headlines endpoint.
 * Queries matching these get routed to the headlines endpoint (better results).
 * All other queries go through the general /search endpoint.
 */
const TOPIC_CATEGORIES = new Set([
  "WORLD", "NATIONAL", "BUSINESS", "TECHNOLOGY",
  "ENTERTAINMENT", "SPORTS", "SCIENCE", "HEALTH"
]);

/**
 * Produces a plain-text summary from an array of article body texts.
 * Strategy: split all text into sentences, filter out short ones, pick the top 5.
 * Simple but effective for a digest — no external summarization service needed.
 *
 * @param {string[]} texts - Array of scraped article body texts
 * @returns {string} A multi-sentence summary paragraph
 */
function summarize(texts) {
  const combined = texts.join(" ");
  const sentences = combined.split(/(?<=[.!?])\s+/).filter(s => s.length > 40);
  return sentences.slice(0, 5).join(" ");
}

export const getNewsDigest = {
  name: "get_news_digest",
  description: "PRIMARY tool for any news request. Fetches articles AND returns a human-readable digest/summary in one call. Use this for: 'what is happening', 'latest news', 'tell me about X', 'world news', 'summarize news', 'give me a digest', or any general news query. Applies saved preferences automatically.",

  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic or keyword to fetch news for. Omit to use the user's saved preferences."
      },
      limit: {
        type: "number",
        description: "Number of articles to include in the digest (default: 5, max: 50)"
      }
    }
  },

  async handler({ topic, limit = 5 } = {}) {
    const prefs = loadPreferences();

    // Resolve the topic: explicit arg → saved preference → global fallback
    const resolvedTopic = topic || prefs.topics[0] || "top news";
    const preferencesNotSet = !topic && prefs.topics.length === 0;
    const { country, language } = prefs;

    // Route to the appropriate API endpoint based on topic type
    let articles;
    if (TOPIC_CATEGORIES.has(resolvedTopic.toUpperCase())) {
      articles = await fetchTopicHeadlines(resolvedTopic, limit, country, language);
    } else {
      articles = await fetchNews(resolvedTopic, limit, country, language);
    }

    // Scrape all article pages in parallel to get full body text
    const articlesWithContent = await Promise.all(
      articles.map(async (article) => {
        const content = await scrapeArticle(article.link);
        return { ...normalizeArticle(article), content: content.slice(0, 3000) };
      })
    );

    // Only summarize articles where scraping succeeded
    const validContent = articlesWithContent
      .filter(a => a.content && a.content !== "Failed to fetch article content.")
      .map(a => a.content);

    const digest = validContent.length > 0
      ? summarize(validContent)
      : "Could not extract article content for summarization.";

    return {
      topic: resolvedTopic,
      digest,
      // Return article metadata without the raw content (keeps response clean)
      articles: articlesWithContent.map(({ content, ...meta }) => meta),
      // Soft nudge — only shown when no preferences are configured
      ...(preferencesNotSet && {
        tip: "No preferences saved yet. Tell me your preferred topics, country, or language and I'll remember them using set_my_preferences."
      })
    };
  }
};
