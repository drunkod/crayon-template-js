import { NextResponse } from "next/server";
import { apiDebug } from "@/lib/debug";
import { isMockOpenRouter } from "./config";
import { handleMockRequest, handleRealRequest } from "./handlers";

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
