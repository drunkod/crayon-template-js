/**
 * Weather tool that fetches real weather data from Open-Meteo API
 * No API key required!
 */

// Get coordinates from city name
async function getCoordinates(location) {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    location,
  )}&count=1`;
  const response = await fetch(geocodingUrl);
  const data = await response.json();
  if (!data.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

// Fetch weather data
async function fetchWeatherData(latitude, longitude) {
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return data;
}

// Convert weather code to description
function getWeatherDescription(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return conditions[code] || "Unknown";
}

// Get weather icon emoji
function getWeatherIcon(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

// Main weather function
export async function getWeather(location) {
  try {
    // Get coordinates
    const { latitude, longitude, name, country } = await getCoordinates(
      location,
    );
    // Fetch weather data
    const weatherData = await fetchWeatherData(latitude, longitude);
    const current = weatherData.current;
    const daily = weatherData.daily;
    return {
      location: name,
      country: country || "",
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m),
      precipitation: current.precipitation,
      condition: getWeatherDescription(current.weather_code),
      icon: getWeatherIcon(current.weather_code),
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      timestamp: current.time,
    };
  } catch (error) {
    console.error("Weather fetch error:", error);
    throw error;
  }
}

// OpenAI tool definition
export const weatherTool = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      "Get current weather information for a specific location. Use this when users ask about weather, temperature, or conditions in a city.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city name (e.g., 'New York', 'London', 'Tokyo')",
        },
      },
      required: ["location"],
    },
  },
};

// Tool executor
export async function executeWeatherTool(args) {
  const { location } = args;
  const weather = await getWeather(location);
  return JSON.stringify(weather);
}
