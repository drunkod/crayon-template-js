/**
 * Mock weather tool for testing without internet
 */
const MOCK_WEATHER_DATA = {
  "paris": {
    location: "Paris",
    country: "France",
    temperature: 14,
    feelsLike: 13,
    humidity: 81,
    windSpeed: 6,
    precipitation: 0.1,
    condition: "Slight rain",
    icon: "🌧️",
    high: 15,
    low: 12,
    timestamp: new Date().toISOString(),
  },
  "tokyo": {
    location: "Tokyo",
    country: "Japan",
    temperature: 22,
    feelsLike: 21,
    humidity: 65,
    windSpeed: 12,
    precipitation: 0,
    condition: "Partly cloudy",
    icon: "⛅",
    high: 24,
    low: 18,
    timestamp: new Date().toISOString(),
  },
  "london": {
    location: "London",
    country: "United Kingdom",
    temperature: 11,
    feelsLike: 9,
    humidity: 78,
    windSpeed: 15,
    precipitation: 0,
    condition: "Overcast",
    icon: "⛅",
    high: 13,
    low: 8,
    timestamp: new Date().toISOString(),
  },
  "new york": {
    location: "New York",
    country: "United States",
    temperature: 18,
    feelsLike: 17,
    humidity: 70,
    windSpeed: 10,
    precipitation: 0,
    condition: "Clear sky",
    icon: "☀️",
    high: 21,
    low: 15,
    timestamp: new Date().toISOString(),
  },
  "sydney": {
    location: "Sydney",
    country: "Australia",
    temperature: 25,
    feelsLike: 24,
    humidity: 60,
    windSpeed: 8,
    precipitation: 0,
    condition: "Mainly clear",
    icon: "☀️",
    high: 27,
    low: 20,
    timestamp: new Date().toISOString(),
  },
};

export async function getMockWeather(location) {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 300));

  const cityKey = location.toLowerCase();

  // Return mock data if available, otherwise generate random data
  if (MOCK_WEATHER_DATA[cityKey]) {
    return {
      ...MOCK_WEATHER_DATA[cityKey],
      timestamp: new Date().toISOString(),
    };
  }

  // Generate random weather for unknown cities
  const conditions = [
    { condition: "Clear sky", icon: "☀️" },
    { condition: "Partly cloudy", icon: "⛅" },
    { condition: "Overcast", icon: "⛅" },
    { condition: "Light rain", icon: "🌧️" },
    { condition: "Mainly clear", icon: "☀️" },
  ];

  const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];
  const temp = Math.floor(Math.random() * 30) + 5;

  return {
    location: location.charAt(0).toUpperCase() + location.slice(1),
    country: "Mock Country",
    temperature: temp,
    feelsLike: temp - 1,
    humidity: Math.floor(Math.random() * 40) + 50,
    windSpeed: Math.floor(Math.random() * 20) + 5,
    precipitation: Math.random() > 0.7 ? parseFloat((Math.random() * 2).toFixed(1)) : 0,
    condition: randomCondition.condition,
    icon: randomCondition.icon,
    high: temp + 3,
    low: temp - 5,
    timestamp: new Date().toISOString(),
  };
}

export async function executeMockWeatherTool(args) {
  const { location } = args;
  const weather = await getMockWeather(location);
  return JSON.stringify(weather);
}
