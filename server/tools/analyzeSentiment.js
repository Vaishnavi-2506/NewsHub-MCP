/**
 * analyzeSentiment.js — Sentiment Analysis Tool
 *
 * Analyzes the emotional tone of a given text and returns a sentiment
 * label (positive / negative / neutral) with a numeric score.
 *
 * Uses the AFINN lexicon via the `sentiment` npm library — each word in
 * the text is scored from -5 (very negative) to +5 (very positive),
 * and the total is summed to produce the final score.
 *
 * Common use cases:
 *   - Analyze tone of a news article or headline
 *   - Compare sentiment across multiple sources on the same topic
 *   - Used in tool chaining after get_latest_news or search_news
 *
 * Tool chaining example:
 *   User: "Get me AI news and analyze the overall sentiment"
 *   → AI calls get_latest_news(topic: "AI")
 *   → AI combines descriptions and calls analyze_sentiment(text: combined)
 */

import { analyzeSentimentText } from "../services/nlpService.js";

export const analyzeSentiment = {
  name: "analyze_sentiment",
  description: "Analyze the sentiment (positive, negative, or neutral) of a news article or any text. Returns a label and numeric score. Often used after get_latest_news or search_news to evaluate the tone of results.",

  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to analyze — can be a headline, article body, or any string"
      }
    },
    required: ["text"]
  },

  async handler({ text }) {
    return analyzeSentimentText(text);
  }
};
