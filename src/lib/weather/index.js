/**
 * Weather module exports
 */

import { getWeather as getWeatherAPI } from './api';
import { getMockWeather } from './mock';
import { isMockWeather } from '@/lib/utils/config';

export { extractLocation } from './parser';
export * from './api';

/**
 * Get weather data (real or mock based on config)
 */
export async function getWeather(location) {
  if (isMockWeather()) {
    return getMockWeather(location);
  }
  return getWeatherAPI(location);
}
