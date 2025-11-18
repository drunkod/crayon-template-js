/**
 * Mock OpenRouter for completely offline testing
 */

export async function getMockCompletion(messages) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const lastMessage = messages[messages.length - 1];

  // 🔧 ROBUST message extraction - handle multiple formats
  let userMessageRaw = '';

  if (!lastMessage) {
    console.log('🎭 MOCK: No last message found');
    userMessageRaw = '';
  } else if (typeof lastMessage.content === 'string') {
    // Simple string content
    userMessageRaw = lastMessage.content;
  } else if (Array.isArray(lastMessage.content)) {
    // OpenAI-style array of content parts
    userMessageRaw = lastMessage.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && part?.text) return part.text;
        if (part?.content) return part.content;
        return '';
      })
      .join(' ');
  } else if (typeof lastMessage.text === 'string') {
    // Alternative: .text field
    userMessageRaw = lastMessage.text;
  } else if (typeof lastMessage.message === 'string') {
    // Alternative: .message field
    userMessageRaw = lastMessage.message;
  } else {
    console.log('🎭 MOCK: Unknown message format:', lastMessage);
  }

  const userMessage = userMessageRaw.toLowerCase().trim();

  console.log('🎭 MOCK: Raw message object:', JSON.stringify(lastMessage, null, 2));
  console.log('🎭 MOCK: Extracted text:', userMessage);

  // Check if user is asking about weather
  const weatherKeywords = ['weather', 'temperature', 'forecast', 'climate'];
  const isWeatherQuery = weatherKeywords.some(keyword =>
    userMessage.includes(keyword)
  );

  console.log('🎭 MOCK: Is weather query?', isWeatherQuery);

  if (isWeatherQuery) {
    // Extract location - IMPROVED PATTERNS
    const patterns = [
      /weather\s+(?:in|at|for)\s+([a-z\s]+?)(?:\?|$|\.)/i,  // "weather in paris"
      /(?:in|at|for)\s+([a-z\s]+?)\s+weather/i,              // "in paris weather"
      /weather\s+([a-z\s]+?)(?:\?|$|\.)/i,                   // "weather paris"
      /([a-z\s]+?)\s+weather/i,                               // "paris weather"
      /(?:what's|what is|how's|how is)\s+(?:the\s+)?weather\s+(?:in|at|for)\s+([a-z\s]+?)(?:\?|$|\.)/i, // "what's the weather in paris"
    ];

    let location = null;
    for (const pattern of patterns) {
      const match = userMessage.match(pattern);
      if (match && match[1]) {
        location = match[1].trim();
        break;
      }
    }

    // Fallback to Paris if no location found
    if (!location) {
      location = 'Paris';
    }

    console.log('🎭 MOCK: Detected location:', location);

    // Mock weather data
    const mockWeatherData = {
      "paris": {
        location: "Paris",
        country: "France",
        temperature: 14,
        feelsLike: 13,
        humidity: 81,
        windSpeed: 6,
        condition: "Slight rain",
        icon: "🌧️",
        high: 15,
        low: 12,
      },
      "tokyo": {
        location: "Tokyo",
        country: "Japan",
        temperature: 22,
        feelsLike: 21,
        humidity: 65,
        windSpeed: 12,
        condition: "Partly cloudy",
        icon: "⛅",
        high: 24,
        low: 18,
      },
      "london": {
        location: "London",
        country: "United Kingdom",
        temperature: 11,
        feelsLike: 9,
        humidity: 78,
        windSpeed: 15,
        condition: "Overcast",
        icon: "☁️",
        high: 13,
        low: 8,
      },
      "new york": {
        location: "New York",
        country: "United States",
        temperature: 18,
        feelsLike: 17,
        humidity: 70,
        windSpeed: 10,
        condition: "Clear sky",
        icon: "☀️",
        high: 21,
        low: 15,
      },
    };

    // Find matching city
    const cityKey = Object.keys(mockWeatherData).find(city => 
      location.toLowerCase().includes(city) || city.includes(location.toLowerCase())
    );

    const weatherData = cityKey ? mockWeatherData[cityKey] : {
      location: location.charAt(0).toUpperCase() + location.slice(1),
      country: "Mock Country",
      temperature: 20,
      feelsLike: 19,
      humidity: 70,
      windSpeed: 10,
      condition: "Clear sky",
      icon: "☀️",
      high: 22,
      low: 18,
    };

    const response = {
      ...weatherData,
      timestamp: new Date().toISOString(),
    };

    console.log('🎭 MOCK: Returning weather data:', response);
    return JSON.stringify(response);
  }

  // Non-weather responses
  const responses = [
    "I'm a helpful AI assistant. I can help you with weather information and answer your questions!",
    "Hello! How can I assist you today?",
    "I'm here to help! Feel free to ask me anything.",
    "That's an interesting question! As a mock AI, I can provide general assistance.",
  ];

  return responses[Math.floor(Math.random() * responses.length)];
}