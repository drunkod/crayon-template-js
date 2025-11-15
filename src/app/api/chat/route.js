import { NextResponse } from "next/server";
import OpenAI from "openai";
import { weatherTool, executeWeatherTool } from "./tools";
import { systemPrompt } from "./systemPrompt";

// In-memory message store (per thread)
const messageStore = new Map();

export async function POST(req) {
  const { messages, threadId } = await req.json();

  // Initialize thread if needed
  if (!messageStore.has(threadId)) {
    messageStore.set(threadId, [
      { role: "system", content: systemPrompt }
    ]);
  }

  // Add user message to history
  const userMessage = messages[messages.length - 1];
  const threadMessages = messageStore.get(threadId);
  threadMessages.push(userMessage);

  // Configure OpenAI client for OpenRouter
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_API_BASE,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
      "X-Title": "Crayon Weather App",
    },
  });

  // Make LLM call with tools
  let response = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
    messages: threadMessages,
    tools: [weatherTool],
    tool_choice: "auto",
  });

  let assistantMessage = response.choices[0].message;

  // Handle tool calls
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    // Add assistant message with tool calls to history
    threadMessages.push(assistantMessage);

    // Execute each tool call
    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      let functionResponse;

      if (functionName === "get_weather") {
        functionResponse = await executeWeatherTool(functionArgs);
      }

      // Add tool response to messages
      threadMessages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: functionResponse,
      });
    }

    // Get next response from LLM
    response = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "anthropic/claude-3.5-sonnet",
      messages: threadMessages,
      tools: [weatherTool],
      tool_choice: "auto",
    });
    assistantMessage = response.choices[0].message;
  }

  // Add final assistant message
  threadMessages.push(assistantMessage);

  // Create streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send the final message content
      const content = assistantMessage.content || "";
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
