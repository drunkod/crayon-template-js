import { aiDebug } from "./debug";

export async function getCoordinates(location) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  return data.results[0];
}

export async function fetchWeatherData(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
  const response = await fetch(url);
  return response.json();
}

export function getWeatherDescription(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow",
    95: "Thunderstorm",
  };
  return conditions[code] || "Unknown";
}

export function getWeatherIcon(code) {
  if (code === 0 || code === 1) return "☀️";
  if (code === 2 || code === 3) return "⛅";
  if (code >= 45 && code <= 48) return "🌫️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

export async function getWeather(location) {
  try {
    aiDebug.log(`Fetching weather for: ${location}`);

    const { latitude, longitude, name, country } = await getCoordinates(location);
    const weatherData = await fetchWeatherData(latitude, longitude);
    const current = weatherData.current;
    const daily = weatherData.daily;

    const result = {
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

    aiDebug.success("Weather fetched", result);
    return result;
  } catch (error) {
    aiDebug.error("Weather fetch failed", error);
    throw error;
  }
}

export function extractLocation(message) {
  if (!message || typeof message !== 'string') return null;

  const text = message.toLowerCase();
  const patterns = [
    /weather (?:in|for|at) ([a-z\s]+?)(?:\?|$|\.)/,
    /(?:in|at|for) ([a-z\s]+?) weather/,
    /^([a-z\s]+?) weather$/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}
