/**
 * nlpService.js — Natural Language Processing Layer
 *
 * Provides text analysis utilities used by the analyze_sentiment
 * and extract_entities tools. All NLP runs locally — no external API calls.
 *
 * Libraries used:
 *   - sentiment   (AFINN-based scoring, npm: sentiment)
 *   - compromise  (lightweight NLP for entity extraction, npm: compromise)
 *
 * Exports:
 *   analyzeSentimentText(text)  — returns sentiment label + numeric score
 *   extractEntities(text)       — returns people, organizations, and topic nouns
 */

import Sentiment from "sentiment";
import nlp from "compromise";

// Instantiate once and reuse — the Sentiment constructor is not cheap
const sentimentAnalyzer = new Sentiment();

/**
 * Analyzes the sentiment (emotional tone) of a piece of text.
 *
 * Uses AFINN word scores: each recognized word gets a score from -5 (very negative)
 * to +5 (very positive). The final score is the sum across all words.
 *
 * @param {string} text - Any text to analyze (article body, headline, etc.)
 * @returns {{ sentiment: "positive"|"negative"|"neutral", score: number }}
 *
 * @example
 *   analyzeSentimentText("Markets soared to record highs today")
 *   // → { sentiment: "positive", score: 3 }
 */
export function analyzeSentimentText(text) {
  const result = sentimentAnalyzer.analyze(text);

  let label = "neutral";
  if (result.score > 0) label = "positive";
  if (result.score < 0) label = "negative";

  return {
    sentiment: label,
    score: result.score
  };
}

/**
 * Extracts named entities from text using the compromise NLP library.
 *
 * - people:        Proper nouns recognized as person names
 * - organizations: Companies, agencies, institutions
 * - topics:        General nouns — used as a proxy for key subjects/themes
 *
 * @param {string} text - Any text to extract entities from
 * @returns {{ people: string[], organizations: string[], topics: string[] }}
 *
 * @example
 *   extractEntities("Elon Musk unveiled Tesla's new model at the Berlin factory")
 *   // → { people: ["Elon Musk"], organizations: ["Tesla"], topics: ["model", "factory", ...] }
 */
export function extractEntities(text) {
  const doc = nlp(text);

  return {
    people: doc.people().out("array"),
    organizations: doc.organizations().out("array"),
    topics: doc.nouns().out("array")
  };
}
