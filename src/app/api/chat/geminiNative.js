import { aiDebug } from "@/lib/debug";
import { createGeminiClient, GEMINI_MODEL, SYSTEM_PROMPT } from "./config";

/**
 * Convert chat messages to Gemini's native format
 * @param {any[]} messages - The chat messages
 * @returns {import("@google/genai").Content[]}
 */
function toGeminiFormat(messages) {
  const contents = [];

  // Add system prompt as first user message (Gemini doesn't have system role)
  contents.push({
    role: "user",
    parts: [{ text: SYSTEM_PROMPT }],
  });
  contents.push({
    role: "model",
    parts: [{ text: "Understood. I'll follow those instructions." }],
  });

  // Convert messages
  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : msg.message || msg.text || "";
    if (!text) continue;
    const role = msg.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text }],
    });
  }
  return contents;
}

/**
 * Call Gemini native streaming API using the SDK
 * @param {any[]} messages - The chat messages
 * @returns {Promise<import("@google/genai").StreamGenerateContentResult>}
 */
export async function callGeminiNative(messages) {
  const contents = toGeminiFormat(messages);
  const genAI = createGeminiClient();
  const model = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    // generationConfig: { temperature: 0.7, maxOutputTokens: 500 } // This is now set in handleGeminiRequest
  });

  aiDebug.log("🌐 Calling Gemini Native API via SDK", {
    model: GEMINI_MODEL,
    messageCount: contents.length,
  });

  try {
    const result = await model.generateContentStream({ contents });
    return result;
  } catch (error) {
    aiDebug.error("Gemini SDK error", {
      message: error.message,
      status: error.status,
      details: error.details,
    });
    // Re-throw a more generic error to the handler
    throw new Error(`Gemini SDK error: ${error.message}`);
  }
}

/**
 * Convert Gemini's SDK streaming response to SSE format for Crayon
 * @param {import("@google/genai").StreamGenerateContentResult} geminiResult - The result from the SDK
 * @returns {ReadableStream<Uint8Array>}
 */
export function geminiStreamToSSE(geminiResult) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiResult.stream) {
          const text = chunk.text();
          if (text) {
            // Send as SSE text event
            const sseEvent = `event: text\ndata: ${text}\n\n`;
            controller.enqueue(encoder.encode(sseEvent));
            aiDebug.log("📤 Gemini SDK chunk", {
              preview: text.substring(0, 50),
            });
          }
        }
        controller.close();
        aiDebug.success("✅ Gemini SDK stream complete");
      } catch (error) {
        aiDebug.error("Gemini SDK stream processing error", error);
        controller.error(error);
      }
    },
  });
}
