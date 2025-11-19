import { aiDebug } from "@/lib/debug";
import { GEMINI_MODEL, getGeminiEndpoint, SYSTEM_PROMPT } from "./config";

/**
 * Convert chat messages to Gemini's native format
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
 * Call Gemini native streaming API
 */
export async function callGeminiNative(messages) {
  const contents = toGeminiFormat(messages);
  const endpoint = getGeminiEndpoint(true); // streaming
  aiDebug.log("🌐 Calling Gemini Native API", {
    model: GEMINI_MODEL,
    endpoint: endpoint.split("?")[0], // Don't log API key
    messageCount: contents.length,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    aiDebug.error("Gemini API error", {
      status: response.status,
      statusText: response.statusText,
      body: errorText.substring(0, 200),
    });
    throw new Error(
      `Gemini API error: ${response.status} ${response.statusText}`,
    );
  }

  return response;
}

/**
 * Convert Gemini's streaming response to SSE format for Crayon
 */
export function geminiStreamToSSE(geminiResponse) {
  const reader = geminiResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim() || !line.startsWith("{")) continue;
            try {
              const data = JSON.parse(line);
              const text =
                data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                // Send as SSE text event
                const sseEvent = `event: text\ndata: ${text}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));
                aiDebug.log("📤 Gemini chunk", {
                  preview: text.substring(0, 50),
                });
              }
            } catch (parseError) {
              aiDebug.warn("Failed to parse Gemini chunk", {
                line: line.substring(0, 100),
              });
            }
          }
        }
        controller.close();
        aiDebug.success("✅ Gemini stream complete");
      } catch (error) {
        aiDebug.error("Gemini stream error", error);
        controller.error(error);
      }
    },
  });
}
