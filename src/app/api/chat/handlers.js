import { NextResponse } from "next/server";
import { fromOpenAICompletion } from "@crayonai/stream";
import { getMockCompletion } from "./mockOpenRouter";
import {
  FREE_MODELS,
  SYSTEM_PROMPT,
  createOpenRouterClient,
  getAiProvider,
  PROVIDERS,
  GEMINI_MODEL,
} from "./config";
import { mockSseResponse, sseResponse } from "./sse";
import { aiDebug } from "@/lib/debug";
import { callGeminiNative, geminiStreamToSSE } from "./geminiNative";

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

// Handle REAL OpenRouter streaming mode with model fallback
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

// Handle REAL Gemini (Native API via SDK) streaming mode with retry logic
async function handleGeminiRequest(messages) {
  aiDebug.log("🌐 Using REAL Gemini Native API (via SDK)");
  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      aiDebug.log(`Gemini SDK attempt ${attempt}/${maxRetries}`);

      // Call native Gemini API via SDK
      const geminiResult = await callGeminiNative(messages);
      aiDebug.success(
        `Gemini SDK model worked on attempt ${attempt}: ${GEMINI_MODEL}`,
      );

      // Convert Gemini SDK stream to SSE format
      const responseStream = geminiStreamToSSE(geminiResult);
      return sseResponse(responseStream);
    } catch (error) {
      lastError = error;

      // The SDK throws a GoogleGenerativeAIResponseError for API issues
      const isRateLimitError =
        error.constructor.name === "GoogleGenerativeAIResponseError" &&
        error.status === 429;

      if (isRateLimitError && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const waitTime = Math.pow(2, attempt) * 1000;
        aiDebug.warn(
          `Gemini rate limited (429), retrying in ${
            waitTime / 1000
          }s... (attempt ${attempt}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue; // Retry the loop
      }

      // Log the error for debugging
      aiDebug.error(`Gemini SDK attempt ${attempt} failed`, {
        error: error.message,
        details: error.details,
        status: error.status,
      });

      // If it's not a rate limit error or we've exhausted retries, break
      break;
    }
  }

  // All retries failed or a non-retriable error occurred
  const is429 =
    lastError?.constructor.name === "GoogleGenerativeAIResponseError" &&
    lastError?.status === 429;

  aiDebug.error(`Gemini SDK failed after ${maxRetries} attempts`, {
    finalMessage: lastError?.message,
  });

  return NextResponse.json(
    {
      error: is429 ? "Gemini rate limit exceeded" : "Gemini request failed",
      message: is429
        ? "You've hit Google's rate limit. Please wait a few minutes or switch to OpenRouter."
        : lastError?.message || "An unknown error occurred with the Gemini SDK",
      suggestion: is429
        ? "Set AI_PROVIDER=openrouter in your .env file for more reliable service."
        : "Check your GEMINI_API_KEY and network connection.",
      attempts: maxRetries,
    },
    { status: is429 ? 429 : 500 },
  );
}