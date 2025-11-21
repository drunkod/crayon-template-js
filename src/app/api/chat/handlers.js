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
      aiDebug.success(`OpenRouter model worked: ${model}, streaming response`);
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

  aiDebug.error(
    `All ${FREE_MODELS.length} OpenRouter models failed`,
    lastError,
  );
  return NextResponse.json(
    {
      error: `All ${FREE_MODELS.length} OpenRouter models failed`,
      message: "Please try again in a few moments",
      attemptedModels: FREE_MODELS.length,
    },
    { status: 503 },
  );
}

async function handleGeminiRequest(messages) {
  aiDebug.log("🌐 Using REAL Gemini Native API (via SDK)");

  const maxRetries = 3;
  const TIMEOUT_MS = 30000;
  const RETRIABLE_STATUS_CODES = [429, 500, 502, 503];

  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      aiDebug.log(`Gemini attempt ${attempt}/${maxRetries}`);

      // Add timeout protection
      const geminiResult = await Promise.race([
        callGeminiNative(messages),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error(`Gemini request timeout after ${TIMEOUT_MS}ms`)),
            TIMEOUT_MS,
          ),
        ),
      ]);

      aiDebug.log(`Gemini API connected on attempt ${attempt}`);

      // Convert stream (this should NOT be retried if it fails)
      const responseStream = geminiStreamToSSE(geminiResult);

      aiDebug.success(`Gemini stream successfully created`);
      return sseResponse(responseStream);
    } catch (error) {
      lastError = error;

      // Determine if this is a retriable error
      const isGeminiApiError =
        error.constructor.name === "GoogleGenerativeAIResponseError";

      const isRetriableStatusCode =
        isGeminiApiError && RETRIABLE_STATUS_CODES.includes(error.status);

      const isTimeout = error.message?.includes("timeout");

      const shouldRetry =
        (isRetriableStatusCode || isTimeout) && attempt < maxRetries;

      if (shouldRetry) {
        // Exponential backoff: 2s, 4s, 8s for rate limits
        // Linear backoff: 1s, 2s, 3s for other errors
        const isRateLimit = error.status === 429;
        const waitTime = isRateLimit
          ? Math.pow(2, attempt) * 1000
          : attempt * 1000;

        aiDebug.warn(
          `Gemini ${isRateLimit ? "rate limited" : "error"} (${
            error.status || "timeout"
          }), ` +
            `retrying in ${waitTime / 1000}s... (${attempt}/${maxRetries})`,
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // Log non-retriable error
      aiDebug.error(`Gemini attempt ${attempt} failed (non-retriable)`, {
        errorType: error.constructor.name,
        message: error.message,
        status: error.status,
      });

      break; // Don't retry
    }
  }

  // All retries exhausted
  const is429 = lastError?.status === 429;

  aiDebug.error(`Gemini failed after ${maxRetries} attempts`, {
    finalError: lastError?.message,
  });

  return NextResponse.json(
    {
      error: is429 ? "Gemini rate limit exceeded" : "Gemini request failed",
      message: is429
        ? "Rate limit reached. Please wait a few minutes."
        : "Unable to connect to Gemini API.",
      suggestion:
        "Try switching to OpenRouter: Set AI_PROVIDER=openrouter in .env",
      attempts: maxRetries,
    },
    { status: is429 ? 429 : 503 },
  );
}
