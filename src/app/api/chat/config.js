import { GoogleGenerativeAI } from "@google/genai";
import OpenAI from "openai";
import { aiDebug } from "@/lib/debug";

// List of free OpenRouter models we'll rotate through
export const FREE_MODELS = [
  "deepseek/deepseek-r1:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

export const SYSTEM_PROMPT = `You are a helpful AI assistant. When users ask about weather, respond with structured JSON in this exact format:
{
  "response": [
    {
      "type": "template",
      "name": "weather",
      "templateProps": {
        "location": "CityName",
        "country": "Country",
        "temperature": 22,
        "feelsLike": 20,
        "humidity": 65,
        "windSpeed": 15,
        "condition": "Partly Cloudy",
        "icon": "⛅",
        "high": 25,
        "low": 18,
        "timestamp": "${new Date().toISOString()}"
      }
    }
  ]
}

For other questions, respond with plain text.

Weather icons: ☀️ (sunny), ⛅ (partly cloudy), ☁️ (cloudy), 🌧️ (rainy), ⛈️ (stormy), 🌨️ (snowy), 🌫️ (foggy)
`;

export const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

// --- Provider selection -----------------------------------------------------

export const PROVIDERS = {
  OPENROUTER: "openrouter",
  GEMINI: "gemini",
};

/**
 * Return which real AI provider to use when not in mock mode.
 * Controlled via AI_PROVIDER / NEXT_PUBLIC_AI_PROVIDER env vars.
 */
export function getAiProvider() {
  const env =
    process.env.AI_PROVIDER || process.env.NEXT_PUBLIC_AI_PROVIDER || "";
  const value = env.toLowerCase().trim();

  if (value === PROVIDERS.GEMINI) {
    return PROVIDERS.GEMINI;
  }

  if (value && value !== PROVIDERS.OPENROUTER) {
    aiDebug.warn(
      `Invalid AI_PROVIDER "${env}". Falling back to default "${PROVIDERS.OPENROUTER}".`,
    );
  }

  // default / fallback
  return PROVIDERS.OPENROUTER;
}

// --- Mock toggles ----------------------------------------------------------
export function isMockAI() {
  return process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER === "true";
}

// --- OpenRouter client -----------------------------------------------------
export function createOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
      "X-Title": "Weather Chat App",
    },
  });
}

// --- Gemini Native API config -----------------------------------------------
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";

/**
 * Create and configure the Google AI client
 */
export function createGeminiClient() {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "Missing GEMINI_API_KEY. Please add it to your .env file.",
    );
  }
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI;
}
