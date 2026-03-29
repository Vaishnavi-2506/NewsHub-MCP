/**
 * extractEntities.js — Named Entity Extraction Tool
 *
 * Identifies and extracts named entities from text, categorized into:
 *   - people:        Person names (politicians, CEOs, public figures)
 *   - organizations: Companies, governments, institutions, agencies
 *   - topics:        General nouns used as a proxy for key subjects/themes
 *
 * Uses the `compromise` NLP library for local, zero-latency processing.
 *
 * Common use cases:
 *   - Find who and what organizations are mentioned in a news article
 *   - Used in tool chaining after search_news or get_latest_news
 *   - Understand key actors in a news story
 *
 * Tool chaining example:
 *   User: "Search for Tesla news and extract key people and organizations"
 *   → AI calls search_news(query: "Tesla")
 *   → AI combines descriptions and calls extract_entities(text: combined)
 */

import { extractEntities } from "../services/nlpService.js";

export const extractEntitiesTool = {
  name: "extract_entities",
  description: "Extract named entities (people, organizations, topics) from text. Use after get_latest_news or search_news to identify key actors and subjects in news articles.",

  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "Text to extract entities from — article body, headlines, or any string"
      }
    },
    required: ["text"]
  },

  async handler({ text }) {
    return extractEntities(text);
  }
};
