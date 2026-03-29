/**
 * scraper.js — Web Article Scraping Layer
 *
 * Fetches the full text content of a news article from its URL.
 * Used by get_news_digest and compare_news_sources to get article body text
 * beyond the short description provided by the news API.
 *
 * Approach: fetches raw HTML via axios, then uses cheerio (server-side jQuery)
 * to extract all <p> tag text — works for most standard news sites.
 *
 * Limitations:
 *   - JavaScript-rendered pages (SPAs) won't return body text
 *   - Sites with paywalls will return gated content only
 *   - Some sites block bot user agents (returns empty or error)
 *
 * Exports:
 *   scrapeArticle(url) — returns extracted plain text from article paragraphs
 */

import axios from "axios";
import * as cheerio from "cheerio";

/**
 * Fetches and extracts the plain text body of a news article.
 *
 * @param {string} url - Full URL of the article to scrape
 * @returns {Promise<string>} Concatenated paragraph text, or an error message string
 *                            if the page could not be fetched/parsed
 *
 * @example
 *   const text = await scrapeArticle("https://example.com/some-article")
 *   // → "The Federal Reserve announced... Interest rates are expected to..."
 */
export async function scrapeArticle(url) {
  try {
    const { data } = await axios.get(url, {
      // Some news sites reject requests without a browser-like User-Agent
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NewsHubMCP/2.0)"
      },
      timeout: 8000 // Don't hang the digest tool if a site is slow
    });

    const $ = cheerio.load(data);

    // Extract text from all <p> tags and join with newlines
    let content = "";
    $("p").each((_, el) => {
      content += $(el).text() + "\n";
    });

    return content.trim();
  } catch {
    // Return a sentinel string rather than throwing — callers check for this
    return "Failed to fetch article content.";
  }
}
