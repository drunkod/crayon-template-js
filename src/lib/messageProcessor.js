import { logger } from '@/lib/utils/debug';
import { getAIProvider, isMockAI, AI_PROVIDERS } from '@/lib/utils/config';
import { getWeather, extractLocation } from '@/lib/weather';
import { callGemini } from '@/lib/ai/gemini';
import { callOpenRouter } from '@/lib/ai/openrouter';
import { getMockAIResponse } from '@/lib/ai/mock';
import {
  createWeatherStream,
  createGeminiStream,
  createOpenRouterStream,
  createTextStream,
} from '@/lib/stream/creators';

/**
 * Process incoming chat message
 */
export async function processMessage({ messages }) {
  logger.api.log('Processing message', { count: messages.length });

  try {
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage?.content || lastMessage?.text || '';

    // 1. Check for weather query
    const location = extractLocation(text);
    if (location) {
      logger.api.log(`Weather query detected: ${location}`);
      const weather = await getWeather(location);
      return createWeatherStream(weather);
    }

    // 2. Check mock mode
    if (isMockAI()) {
      logger.api.log('Using MOCK AI');
      const mockResponse = await getMockAIResponse(messages);
      return createTextStream(mockResponse);
    }

    // 3. Call real AI provider
    const provider = getAIProvider();
    logger.api.log(`Using AI provider: ${provider}`);

    if (provider === AI_PROVIDERS.GEMINI) {
      const stream = await callGemini(messages);
      return createGeminiStream(stream);
    } else {
      const stream = await callOpenRouter(messages);
      return createOpenRouterStream(stream);
    }
  } catch (error) {
    logger.api.error('Message processing failed', error);
    throw error;
  }
}
