import { NextResponse } from "next/server";
import { STREAM_HEADERS } from "./config";

// Mock SSE stream for offline mode (same behavior as before)
export function createMockSseStream(content, isWeather = false) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      try {
        if (isWeather) {
          // Send template event
          const tplEvent = `event: tpl\ndata: ${JSON.stringify({
            name: "weather",
            templateProps: content,
          })}\n\n`;
          controller.enqueue(encoder.encode(tplEvent));
        } else {
          // Send text event
          const textEvent = `event: text\ndata: ${content}\n\n`;
          controller.enqueue(encoder.encode(textEvent));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

// Helper to wrap a stream into a NextResponse with SSE headers
export function sseResponse(stream) {
  return new NextResponse(stream, { headers: STREAM_HEADERS });
}

// Convenience for mock mode
export function mockSseResponse(content, isWeather) {
  return sseResponse(createMockSseStream(content, isWeather));
}
