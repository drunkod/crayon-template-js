import { NextResponse } from "next/server";
import { fromOpenAICompletion } from "@crayonai/stream";
import { getMockCompletion } from "./mockOpenRouter";
import {
  FREE_MODELS,
  SYSTEM_PROMPT,
  createOpenRouterClient,
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

// Handle REAL OpenRouter streaming mode
export async function handleRealRequest(messages) {
  aiDebug.log("🌐 Using REAL OpenRouter API");
  const client = createOpenRouterClient();
  const messagesWithSystem = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages,
  ];

  let lastError = null;
  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = FREE_MODELS[i];
    aiDebug.log(`Trying model [${i + 1}/${FREE_MODELS.length}]: ${model}`);
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: messagesWithSystem,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
      });

      aiDebug.success(`Model worked: ${model}, streaming response`);
      const responseStream = fromOpenAICompletion(completion);
      return sseResponse(responseStream);
    } catch (error) {
      aiDebug.warn(`Model failed: ${model}`, {
        status: error.status,
        message: error.message?.substring(0, 80),
      });
      lastError = error;

      // For these statuses, we just try the next free model
      // For other errors, also continue to the next model
      continue;
    }
  }

  aiDebug.error(`All ${FREE_MODELS.length} models failed`, lastError);
  return NextResponse.json(
    {
      error: `All ${FREE_MODELS.length} free models failed`,
      message: "Please try again in a few moments",
      attemptedModels: FREE_MODELS.length,
    },
    { status: 503 },
  );
}
