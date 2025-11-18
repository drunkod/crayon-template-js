import { WeatherCard } from "./components/WeatherCard";

export const weatherCardTemplate = {
  type: "weather_card",
  component: WeatherCard,
  match: (data) => {
    // Match JSON objects with weather data structure
    if (typeof data === 'object' && data && data.location && data.temperature !== undefined) {
      return true;
    }
    // Also try to parse strings that might be JSON
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return parsed.location && parsed.temperature !== undefined;
      } catch {
        return false;
      }
    }
    return false;
  },
  props: (data) => {
    const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
    return parsedData;
  },
};

export const allTemplates = [weatherCardTemplate];
