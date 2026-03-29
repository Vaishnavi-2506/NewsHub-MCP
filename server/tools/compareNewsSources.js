/**
 * compareNewsSources.js — Multi-Source Comparison Tool
 *
 * Fetches multiple articles on the same topic from different news sources,
 * scrapes each one, and returns a side-by-side summary of how each outlet
 * is framing the story.
 *
 * Pipeline per article:
 *   1. Search for articles on the topic (up to 3 sources)
 *   2. Scrape full body text from each article URL in parallel
 *   3. Extract a 2-sentence summary from each article's body
 *   4. Return all summaries together for comparison
 *
 * Example use cases:
 *   "How are different outlets covering the Ukraine conflict?"
 *   "Compare news sources on the latest Fed interest rate decision"
 *   "Show me different perspectives on the AI regulation debate"
 *
 * Note: Results depend on scraping success. Paywalled or JS-rendered
 * articles will have shorter/empty summaries.
 */

import { searchNews } from "../services/newsService.js";
import { scrapeArticle } from "../services/scraper.js";
import { loadPreferences } from "../services/preferencesService.js";

/**
 * Extracts a brief 2-sentence summary from scraped article text.
 * Filters out very short sentences (navigation text, captions, etc.)
 *
 * @param {string} text - Full scraped article body
 * @returns {string} 2-sentence summary
 */
function simpleSummary(text) {
  const sentences = text.split(". ").filter(s => s.length > 40);
  return sentences.slice(0, 2).join(". ") + ".";
}

export const compareNewsSources = {
  name: "compare_news_sources",
  description: "Compare how different news sources report on the same topic. Returns a side-by-side summary from each outlet. Use for: 'how are outlets covering X', 'compare perspectives on Y', 'different sources on Z'.",

  inputSchema: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "Topic or event to compare across news sources"
      }
    },
    required: ["topic"]
  },

  async handler({ topic }) {
    const { country, language } = loadPreferences();

    // Fetch 3 articles — enough to show different source perspectives
    const articles = await searchNews(topic, 3, country, language);

    // Scrape all articles in parallel for speed
    const comparisons = await Promise.all(
      articles.map(async (article) => {
        const content = await scrapeArticle(article.link);
        return {
          source: article.source_name,
          title: article.title,
          url: article.link,
          summary: simpleSummary(content)
        };
      })
    );

    return { topic, comparisons };
  }
};
