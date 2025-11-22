import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { aiDebug } from "./debug";

// ============================================================================
// CONFIGURATION
// ============================================================================

export const PROVIDERS = {
  OPENROUTER: "openrouter",
  GEMINI: "gemini",
};

export const FREE_MODELS = [
  "deepseek/deepseek-r1:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
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

For other questions, respond with plain text.`;

// ============================================================================
// PROVIDER SELECTION
// ============================================================================

export function getAiProvider() {
  const provider = process.env.NEXT_PUBLIC_AI_PROVIDER?.toLowerCase().trim() || "openrouter";
  return provider === PROVIDERS.GEMINI ? PROVIDERS.GEMINI : PROVIDERS.OPENROUTER;
}

export function isMockAI() {
  return process.env.NEXT_PUBLIC_USE_MOCK_AI === "true";
}

// ============================================================================
// MOCK AI
// ============================================================================

export async function getMockAIResponse(messages) {
  await new Promise(resolve => setTimeout(resolve, 500));

  const lastMessage = messages[messages.length - 1];
  const text = lastMessage?.content || lastMessage?.text || "";
  const isWeather = /weather/i.test(text);

  if (isWeather) {
    return {
      type: "weather",
      data: {
        location: "Paris",
        country: "France",
        "temperature": 14,
        feelsLike: 13,
        humidity: 81,
        windSpeed: 6,
        condition: "Slight rain",
        icon: "🌧️",
        high: 15,
        low: 12,
        timestamp: new Date().toISOString(),
      }
    };
  }

  return {
    type: "text",
    data: "I'm a helpful AI assistant! (Mock mode)"
  };
}

// ============================================================================
// OPENROUTER CLIENT
// ============================================================================

export function createOpenRouterClient() {
  return new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
    baseURL: process.env.NEXT_PUBLIC_OPENROUTER_API_BASE || "https://openrouter.ai/api/v1",
    dangerouslyAllowBrowser: true, // Required for client-side
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_OPENROUTER_SITE_URL,
      "X-Title": "Weather Chat App",
    },
  });
}

export async function callOpenRouter(messages) {
  const client = createOpenRouterClient();
  const messagesWithSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  for (const model of FREE_MODELS) {
    try {
      aiDebug.log(`Trying OpenRouter model: ${model}`);

      const completion = await client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      });

      aiDebug.success(`OpenRouter connected: ${model}`);
      return completion;
    } catch (error) {
      aiDebug.warn(`Model ${model} failed`, error);
      continue;
    }
  }

  throw new Error("All OpenRouter models failed");
}

// ============================================================================
// GEMINI CLIENT
// ============================================================================

export function createGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
}

function toGeminiFormat(messages) {
  const contents = [];

  for (const msg of messages) {
    const text = msg.content || msg.message || msg.text || "";
    if (!text) continue;

    const role = msg.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text }],
    });
  }

  return contents;
}

export async function callGemini(messages) {
  const client = createGeminiClient();
  const contents = toGeminiFormat(messages);
  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.0-flash-exp";
  const temperature = parseFloat(process.env.NEXT_PUBLIC_GEMINI_TEMPERATURE || "0.7");

  aiDebug.log(`Calling Gemini: ${model}`);

  const result = await client.models.generateContentStream({
    model,
    contents,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature,
    },
  });

  aiDebug.success("Gemini connected");
  return result;
}
