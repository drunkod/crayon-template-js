import { NextResponse } from "next/server";
import { apiDebug } from "@/lib/debug";
import { isMockOpenRouter } from "./config";
import { handleMockRequest, handleRealRequest } from "./handlers";

import { getWeather } from "./tools";
import { extractLocation } from "./locationUtils";
import { mockSseResponse } from "./sse"; // can reuse this SSE helper

export async function POST(req) {
  const requestId = Math.random().toString(36).substring(7);
  apiDebug.log(`📨 New request [${requestId}]`);

  try {
    const { messages } = await req.json();
    const last = messages[messages.length - 1];
    let preview = "";

    if (last) {
      if (typeof last.content === "string") {
        preview = last.content.slice(0, 50);
      } else if (Array.isArray(last.content)) {
        preview = JSON.stringify(last.content).slice(0, 80);
      } else if (typeof last.text === "string") {
        preview = last.text.slice(0, 50);
      } else if (typeof last.message === "string") {
        preview = last.message.slice(0, 50);
      } else {
        preview = JSON.stringify(last).slice(0, 80);
      }
    } else {
      preview = "[No messages]";
    }

    apiDebug.log("Messages received", {
      count: messages.length,
      lastMessage: preview,
      fullLastMessage: last,
    });

    // 🔹 1) Extract plain text from last message
    const lastText =
      typeof last?.content === "string"
        ? last.content
        : last?.message || last?.text || "";

    // 🔹 2) Detect location for weather queries
    const location = extractLocation(lastText);

    if (location) {
      // 🔹 3) Use real (or mock) weather tool
      const weather = await getWeather(location);

      // 🔹 4) Send as SSE template event so WeatherCard renders it
      return mockSseResponse(weather, true);
      // mockSseResponse just builds: event: tpl, data: { name:"weather", templateProps: weather }
    }

    // 🔹 5) Otherwise, fall back to AI (mock or real)
    if (isMockOpenRouter()) {
      return await handleMockRequest(messages);
    }

    return await handleRealRequest(messages);
  } catch (error) {
    apiDebug.error("Route error", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
