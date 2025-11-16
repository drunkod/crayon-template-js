import { z } from 'zod';

export const WeatherSchema = z.object({
  location: z.string(),
  country: z.string().optional(),
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  precipitation: z.number().optional(),
  condition: z.string(),
  icon: z.string(),
  high: z.number(),
  low: z.number(),
  timestamp: z.string(),
});