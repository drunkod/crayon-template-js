import { NextResponse } from "next/server";
import { fromOpenAICompletion } from "@crayonai/stream";
import { getMockCompletion } from "./mockOpenRouter";
import {
  FREE_MODELS,
  SYSTEM_PROMPT,
  createOpenRouterClient,
  createGeminiClient,
  GEMINI_MODEL,
  getAiProvider,
  PROVIDERS,
} from "./config";
import { mockSseResponse, sseResponse } from "./sse";
import { aiDebug } from "@/lib/debug";

// Handle MOCK mode (offline, using mockOpenRouter)
export async function handleMockRequest(messages) {
  aiDebug.log("🎭 Using MOCK OpenRouter");
  const aiResponse = await getMockCompletion(messages);
  aiDebug.success("Mock response generated", {
    preview: aiResponse.substring(0, 100),
  });

  // Try to parse as weather JSON
  let weatherData = null;
  try {
    const parsed = JSON.parse(aiResponse);
    if (parsed.location && typeof parsed.temperature === "number") {
      weatherData = parsed;
      aiDebug.log("✅ Detected weather data", { location: parsed.location });
    }
  } catch {
    aiDebug.log("Response is text, not JSON");
  }

  if (weatherData) {
    // Remove any template field if present
    const { template, ...cleanWeatherData } = weatherData;
    return mockSseResponse(cleanWeatherData, true);
  }

  // Plain text response
  return mockSseResponse(aiResponse, false);
}

// ---------------------------------------------------------------------------
// REAL providers
// ---------------------------------------------------------------------------

/**
 * Entry point used by the route. Dispatches to the configured real provider.
 */
export async function handleRealRequest(messages) {
  const provider = getAiProvider();
  aiDebug.log(`🤖 Using AI Provider: ${provider}`);
  if (provider === PROVIDERS.GEMINI) {
    return handleGeminiRequest(messages);
  }
  // default: OpenRouter
  return handleOpenRouterRequest(messages);
}

// Handle REAL OpenRouter streaming mode
async function handleOpenRouterRequest(messages) {
  aiDebug.log("🌐 Using REAL OpenRouter API");
  const client = createOpenRouterClient();
  const messagesWithSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  let lastError = null;
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i];
    aiDebug.log(
      `Trying OpenRouter model [${i + 1}/${FREE_MODELS.length}]: ${model}`,
    );
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      });
      aiDebug.success(
        `OpenRouter model worked: ${model}, streaming response`,
      );
      const responseStream = fromOpenAICompletion(completion);
      return sseResponse(responseStream);
    } catch (error) {
      aiDebug.warn(`OpenRouter model failed: ${model}`, {
        status: error.status,
        message: error.message?.substring(0, 80),
      });
      lastError = error;
      continue;
    }
  }

  aiDebug.error(`All ${FREE_MODELS.length} OpenRouter models failed`, lastError);
  return NextResponse.json(
    {
      error: `All ${FREE_MODELS.length} OpenRouter models failed`,
      message: "Please try again in a few moments",
      attemptedModels: FREE_MODELS.length,
    },
    { status: 503 },
  );
}

// Handle REAL Gemini (Google AI Studio) streaming mode
async function handleGeminiRequest(messages) {
  aiDebug.log(
    "🌐 Using REAL Gemini API (Google AI Studio, OpenAI compatible endpoint)",
  );
  const client = createGeminiClient();
  const messagesWithSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const completion = await client.chat.completions.create({
      model: GEMINI_MODEL,
      messages: messagesWithSystem,
      stream: true,
      temperature: 0.7,
      max_tokens: 500,
    });
    aiDebug.success(
      `Gemini model worked: ${GEMINI_MODEL}, streaming response`,
    );
    const responseStream = fromOpenAICompletion(completion);
    return sseResponse(responseStream);
  } catch (error) {
    aiDebug.error("Gemini model failed", {
      status: error.status,
      message: error.message?.substring(0, 200),
    });
    return NextResponse.json(
      {
        error: "Gemini request failed",
        message: error.message,
      },
      { status: error.status || 500 },
    );
  }
}
