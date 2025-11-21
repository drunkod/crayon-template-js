import { aiDebug } from "@/lib/debug";
import {
  createGeminiClient,
  GEMINI_MODEL,
  SYSTEM_PROMPT,
  GEMINI_TEMPERATURE,
} from "./config";

/**

Convert chat messages to Gemini's native format

@param {any[]} messages - The chat messages

@returns {import("@google/genai").Content[]}
*/
function toGeminiFormat(messages) {
  const contents = [];

  // UPDATED: We no longer manually inject the system prompt here as a user message.
  // The new SDK handles it via the config.systemInstruction parameter.

  // Convert messages
  for (const msg of messages) {
    const text =
      typeof msg.content === "string"
        ? msg.content
        : msg.message || msg.text || "";
    if (!text) continue;

    // Map 'assistant' to 'model'
    const role = msg.role === "assistant" ? "model" : "user";
    contents.push({
      role,
      parts: [{ text }],
    });
  }
  return contents;
}

/**

Call Gemini native streaming API using the SDK

@param {any[]} messages - The chat messages

@returns {Promise<import("@google/genai").GenerateContentStreamResult>}
*/
export async function callGeminiNative(messages) {
  const contents = toGeminiFormat(messages);
  const ai = createGeminiClient();

  aiDebug.log("🌐 Calling Gemini Native API via SDK", {
    model: GEMINI_MODEL,
    messageCount: contents.length,
  });

  try {
    // UPDATED: New SDK call signature
    // ai.models.generateContentStream({ model, contents, config })
    const result = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: GEMINI_TEMPERATURE,
      },
    });
    return result;
  } catch (error) {
    const errorDetails = {
      message: error.message,
      ...(error.status && { status: error.status }),
      ...(error.details && { details: error.details }),
    };

    aiDebug.error("Gemini SDK error", errorDetails);
    // Re-throw to the handler
    throw new Error(`Gemini SDK error: ${error.message}`);
  }
}

/**

Convert Gemini's SDK streaming response to SSE format for Crayon

@param {AsyncIterable<any>} geminiStream - The iterable response from the SDK

@returns {ReadableStream<Uint8Array>}
*/
export function geminiStreamToSSE(geminiStream) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        // UPDATED: Iterate directly over the response iterable
        for await (const chunk of geminiStream) {
          // UPDATED: Access .text property (getter), not .text() method
          const text = chunk.text;

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
