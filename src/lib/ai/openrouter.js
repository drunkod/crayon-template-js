import OpenAI from 'openai';
import { logger } from '@/lib/utils/debug';
import { FREE_MODELS, SYSTEM_PROMPT } from '@/lib/utils/config';

/**
 * Create OpenRouter client
 */
export function createOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
    baseURL: process.env.NEXT_PUBLIC_OPENROUTER_API_BASE || 'https://openrouter.ai/api/v1',
    dangerouslyAllowBrowser: true,
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_OPENROUTER_SITE_URL || '',
      'X-Title': 'Weather Chat App',
    },
  });
}

/**
 * Call OpenRouter with model fallback
 */
export async function callOpenRouter(messages) {
  const client = createOpenRouterClient();
  const messagesWithSystem = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  for (const model of FREE_MODELS) {
    try {
      logger.ai.log(`Trying OpenRouter model: ${model}`);

      const completion = await client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      });

      logger.ai.success(`OpenRouter connected: ${model}`);
      return completion;
    } catch (error) {
      logger.ai.warn(`Model ${model} failed`, error.message);
      continue;
    }
  }

  throw new Error('All OpenRouter models failed');
}
