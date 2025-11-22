/**
 * Location extraction from user messages
 */

/**
 * Extract location from message text
 * Handles typos like "weater" instead of "weather"
 */
export function extractLocation(message) {
  if (!message || typeof message !== 'string') return null;

  const text = message.toLowerCase().trim();

  const patterns = [
    // "weather in Paris", "weater in tokyo" (handles typos with ?)
    /wea?the?r\s+(?:in|for|at)\s+([a-z\s]+?)(?:\?|!|$|\.)/,

    // "in Paris weather", "for tokyo weather"
    /(?:in|at|for)\s+([a-z\s]+?)\s+wea?the?r/,

    // "Paris weather", "tokyo weather"
    /^([a-z\s]+?)\s+wea?the?r$/,

    // "What's the weather in Paris?"
    /(?:what'?s|what is|how'?s|how is)\s+(?:the\s+)?wea?the?r\s+(?:in|at|for)\s+([a-z\s]+?)(?:\?|!|$|\.)/,

    // "tell me the weather for Tokyo"
    /(?:tell me|show me|get)\s+(?:the\s+)?wea?the?r\s+(?:in|for|at)\s+([a-z\s]+?)(?:\?|!|$|\.)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();

      // Filter out common false positives
      const stopWords = ['the', 'a', 'an', 'is', 'was', 'are', 'my', 'your'];
      if (!stopWords.includes(location) && location.length > 1) {
        return location;
      }
    }
  }

  return null;
}
