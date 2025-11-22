/**
 * Mock weather data for testing
 */

const MOCK_DATA = {
  paris: {
    location: 'Paris',
    country: 'France',
    temperature: 14,
    feelsLike: 13,
    humidity: 81,
    windSpeed: 6,
    precipitation: 0.1,
    condition: 'Slight rain',
    icon: '🌧️',
    high: 15,
    low: 12,
  },
  tokyo: {
    location: 'Tokyo',
    country: 'Japan',
    temperature: 22,
    feelsLike: 21,
    humidity: 65,
    windSpeed: 12,
    precipitation: 0,
    condition: 'Partly cloudy',
    icon: '⛅',
    high: 24,
    low: 18,
  },
  london: {
    location: 'London',
    country: 'United Kingdom',
    temperature: 11,
    feelsLike: 9,
    humidity: 78,
    windSpeed: 15,
    precipitation: 0,
    condition: 'Overcast',
    icon: '☁️',
    high: 13,
    low: 8,
  },
};

/**
 * Get mock weather data
 */
export async function getMockWeather(location) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  const key = location.toLowerCase();
  const mockData = MOCK_DATA[key];

  if (mockData) {
    return {
      ...mockData,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate random data for unknown locations
  return {
    location: location.charAt(0).toUpperCase() + location.slice(1),
    country: 'Mock Country',
    temperature: Math.floor(Math.random() * 30) + 5,
    feelsLike: Math.floor(Math.random() * 30) + 4,
    humidity: Math.floor(Math.random() * 40) + 50,
    windSpeed: Math.floor(Math.random() * 20) + 5,
    precipitation: 0,
    condition: 'Clear sky',
    icon: '☀️',
    high: Math.floor(Math.random() * 35) + 8,
    low: Math.floor(Math.random() * 15) + 2,
    timestamp: new Date().toISOString(),
  };
}
