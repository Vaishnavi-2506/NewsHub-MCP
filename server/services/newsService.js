/**
 * newsService.js — News API Integration Layer
 *
 * Handles all communication with the RapidAPI "Real-Time News Data" endpoint.
 * This is the only file that makes external HTTP calls for news data.
 *
 * API used: real-time-news-data.p.rapidapi.com
 * Docs:     rapidapi.com → search "Real-Time News Data"
 *
 * Exports:
 *   fetchNews(query, limit, country, language)     — keyword/phrase search
 *   searchNews(query, limit, country, language)    — alias for fetchNews (used by search tool)
 *   fetchTopicHeadlines(topic, limit, country, language) — predefined category headlines
 *   normalizeArticle(article)                      — maps API response shape to internal shape
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

const RAPIDAPI_HOST = "real-time-news-data.p.rapidapi.com";
const BASE_URL = `https://${RAPIDAPI_HOST}`;

/**
 * Builds the required RapidAPI auth headers.
 * Called fresh on each request so key changes in .env are picked up at runtime.
 */
function buildHeaders() {
  return {
    "x-rapidapi-key": process.env.RAPIDAPI_KEY,
    "x-rapidapi-host": RAPIDAPI_HOST
  };
}

/**
 * Search for news articles by any keyword or phrase.
 * Uses the /search endpoint — works for any freeform query.
 *
 * @param {string} query    - Search term, e.g. "electric vehicles" or "Apple earnings"
 * @param {number} limit    - Max articles to return (default 5, max 50)
 * @param {string} country  - ISO 3166-1 alpha-2 country code, e.g. "US", "GB", "IN"
 * @param {string} language - ISO 639-1 language code, e.g. "en", "fr", "de"
 * @returns {Promise<Array>} Raw article objects from the API
 */
export async function fetchNews(query, limit = 5, country = "US", language = "en") {
  const response = await axios.get(`${BASE_URL}/search`, {
    params: { query, limit, country, lang: language, time_published: "anytime" },
    headers: buildHeaders()
  });
  return response.data.data || [];
}

/**
 * Alias of fetchNews — used by the search_news tool.
 * Kept separate so tool intent is clear at the call site.
 * @returns {Promise<Array>}
 */
export async function searchNews(query, limit = 5, country = "US", language = "en") {
  return fetchNews(query, limit, country, language);
}

/**
 * Fetch top headlines for a predefined news category.
 * Uses the /topic-headlines endpoint — better results for broad category browsing.
 *
 * Valid topic values (case-insensitive):
 *   WORLD, NATIONAL, BUSINESS, TECHNOLOGY, ENTERTAINMENT, SPORTS, SCIENCE, HEALTH
 *
 * @param {string} topic    - One of the valid category names above
 * @param {number} limit    - Max articles to return (default 5)
 * @param {string} country  - Country code, e.g. "US"
 * @param {string} language - Language code, e.g. "en"
 * @returns {Promise<Array>} Raw article objects from the API
 */
export async function fetchTopicHeadlines(topic, limit = 5, country = "US", language = "en") {
  const response = await axios.get(`${BASE_URL}/topic-headlines`, {
    params: { topic: topic.toUpperCase(), limit, country, lang: language },
    headers: buildHeaders()
  });
  return response.data.data || [];
}

/**
 * Normalizes a raw API article object into the internal shape used by all tools.
 *
 * RapidAPI returns:        Our internal shape:
 *   article.link        →  article.url
 *   article.source_name →  article.source
 *   article.pubDate     →  article.published_at
 *   article.description →  article.description
 *   article.title       →  article.title  (unchanged)
 *
 * @param {Object} article - Raw article object from the API
 * @returns {Object} Normalized article
 */
export function normalizeArticle(article) {
  return {
    title: article.title,
    url: article.link,
    source: article.source_name,
    published_at: article.pubDate,
    description: article.description || ""
  };
}
