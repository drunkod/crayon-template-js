// Extracts location from user message
export function extractLocation(message) {
  // Add validation for undefined/null/non-string input
  if (!message || typeof message !== 'string') {
    return null;
  }
  const text = message.toLowerCase();

  // Common patterns
  const patterns = [
    /weather (?:in|for|at) ([a-z\s]+?)(?:\?|$|\.)/,
    /(?:what's|what is|how's|how is) (?:the )?weather (?:in|at|for) ([a-z\s]+?)(?:\?|$|\.)/,
    /(?:in|at|for) ([a-z\s]+?) weather/,
    /^([a-z\s]+?) weather$/,
    /weather: ([a-z\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Fallback: look for city names (common ones)
  const cities = ['paris', 'london', 'tokyo', 'new york', 'sydney', 'berlin', 'moscow', 'beijing', 'mumbai', 'dubai'];
  for (const city of cities) {
    if (text.includes(city)) {
      return city;
    }
  }

  return null;
}
