/**
 * Application configuration and environment variables
 */

export const AI_PROVIDERS = {
  OPENROUTER: 'openrouter',
  GEMINI: 'gemini',
};

export const FREE_MODELS = [
  'deepseek/deepseek-r1:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

export const SYSTEM_PROMPT =
  'You are a helpful AI assistant. Be concise and friendly in your responses.';

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
};

/**
 * Get active AI provider from environment
 */
export function getAIProvider() {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER?.toLowerCase().trim();
  return provider === AI_PROVIDERS.GEMINI ? AI_PROVIDERS.GEMINI : AI_PROVIDERS.OPENROUTER;
}

/**
 * Check if mock AI mode is enabled
 */
export function isMockAI() {
  return process.env.NEXT_PUBLIC_USE_MOCK_AI === 'true';
}

/**
 * Check if mock weather mode is enabled
 */
export function isMockWeather() {
  return process.env.NEXT_PUBLIC_USE_MOCK_WEATHER === 'true';
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode() {
  return process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
}
