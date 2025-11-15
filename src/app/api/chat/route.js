import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";
import { weatherTool, executeWeatherTool } from "./tools";
import { systemPrompt } from "./systemPrompt";

// In-memory message store (per thread)
const messageStore = new Map();

// Retry helper function
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429 && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Get available fallback models
const FALLBACK_MODELS = [
  "kwaipilot/kat-coder-pro:free",
  "google/gemini-flash-1.5:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

export async function POST(req) {
  try {
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
    
    // Convert to OpenAI format
    const openAIMessages = toOpenAIMessages([...threadMessages, userMessage]);

    // Configure OpenAI client for OpenRouter
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_API_BASE,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
        "X-Title": "Crayon Weather App",
      },
    });

    const modelToUse = process.env.OPENROUTER_MODEL || FALLBACK_MODELS[0];

    // Make LLM call with tools (NON-STREAMING for tool calls) with retry
    let response;
    try {
      response = await retryWithBackoff(async () => {
        return await client.chat.completions.create({
          model: modelToUse,
          messages: openAIMessages,
          tools: [weatherTool],
          tool_choice: "auto",
          stream: false,
        });
      });
    } catch (error) {
      // Try fallback models if primary fails
      if (error.status === 429) {
        console.log(`Model ${modelToUse} failed. Trying fallbacks...`);
        for (const fallbackModel of FALLBACK_MODELS) {
          if (fallbackModel === modelToUse) continue;
          try {
            console.log(`Trying ${fallbackModel}...`);
            response = await client.chat.completions.create({
              model: fallbackModel,
              messages: openAIMessages,
              tools: [weatherTool],
              tool_choice: "auto",
              stream: false,
            });
            console.log(`Success with ${fallbackModel}`);
            break;
          } catch (fallbackError) {
            console.log(`${fallbackModel} also failed:`, fallbackError.message);
            continue;
          }
        }
      }
      
      if (!response) {
        throw new Error("All models are rate-limited. Please try again in a few minutes.");
      }
    }

    let assistantMessage = response.choices[0].message;

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      // Add assistant message with tool calls to history
      openAIMessages.push(assistantMessage);

      // Execute each tool call
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResponse;

        if (functionName === "get_weather") {
          functionResponse = await executeWeatherTool(functionArgs);
        }

        // Add tool response to messages
        openAIMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: functionResponse,
        });
      }

      // Get next response from LLM with retry
      response = await retryWithBackoff(async () => {
        return await client.chat.completions.create({
          model: modelToUse,
          messages: openAIMessages,
          tools: [weatherTool],
          tool_choice: "auto",
          stream: false,
        });
      });
      
      assistantMessage = response.choices[0].message;
    }

    // Update the stored messages
    threadMessages.push(userMessage);
    threadMessages.push(assistantMessage);

    // NOW stream with proper Crayon format
    const llmStream = await retryWithBackoff(async () => {
      return await client.chat.completions.create({
        model: modelToUse,
        messages: openAIMessages,
        stream: true,
        response_format: templatesToResponseFormat(),
      });
    });

    // Convert to Crayon stream format
    const responseStream = fromOpenAICompletion(llmStream);

    return new NextResponse(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    
    // Return error as JSON
    return NextResponse.json(
      { 
        error: error.message || "An error occurred processing your request",
        details: error.status === 429 
          ? "The AI service is temporarily rate-limited. Please try again in a few moments."
          : "Please check your API key and try again."
      },
      { status: error.status || 500 }
    );
  }
}