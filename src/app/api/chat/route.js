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

// ALL available free models from OpenRouter
const ALL_FREE_MODELS = [
  "deepseek/deepseek-r1:free",
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mistral-7b-instruct:free",
  "google/gemini-flash-1.5:free",
  "microsoft/phi-3-mini-128k-instruct:free",
];

// Track failed models to avoid retrying them immediately
const failedModels = new Map(); // model -> timestamp

// Clean up failed models older than 5 minutes
function cleanupFailedModels() {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  for (const [model, timestamp] of failedModels.entries()) {
    if (timestamp < fiveMinutesAgo) {
      failedModels.delete(model);
    }
  }
}

// Get available models (excluding recently failed ones)
function getAvailableModels() {
  cleanupFailedModels();
  return ALL_FREE_MODELS.filter(model => !failedModels.has(model));
}

// Mark model as failed
function markModelFailed(model) {
  failedModels.set(model, Date.now());
  console.log(`Marked ${model} as failed. Available models: ${getAvailableModels().length}`);
}

// Try multiple models until one succeeds
async function tryModelsUntilSuccess(client, modelList, requestFn) {
  const availableModels = modelList.filter(m => !failedModels.has(m));

  if (availableModels.length === 0) {
    console.log("All models failed recently. Clearing failed models cache...");
    failedModels.clear();
    availableModels.push(...modelList);
  }

  let lastError;

  for (const model of availableModels) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await requestFn(model);
      console.log(`✓ Success with ${model}`);
      return { response, modelUsed: model };
    } catch (error) {
      console.log(`✗ Failed with ${model}: ${error.message}`);
      lastError = error;

      // Only mark as failed if it's a rate limit error
      if (error.status === 429 || error.message?.includes("rate-limit")) {
        markModelFailed(model);
      }

      // Continue to next model
      continue;
    }
  }

  // All models failed
  throw lastError || new Error("All models are currently unavailable. Please try again later.");
}

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

    // Start with preferred model, but prepare to try others
    const preferredModel = process.env.OPENROUTER_MODEL || ALL_FREE_MODELS[0];
    const modelsToTry = [
      preferredModel,
      ...ALL_FREE_MODELS.filter(m => m !== preferredModel)
    ];

    // Make LLM call with tools (NON-STREAMING for tool calls)
    const { response, modelUsed } = await tryModelsUntilSuccess(
      client,
      modelsToTry,
      async (model) => {
        return await client.chat.completions.create({
          model,
          messages: openAIMessages,
          tools: [weatherTool],
          tool_choice: "auto",
          stream: false,
        });
      }
    );

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

      // Get next response from LLM (use same successful model)
      const { response: nextResponse } = await tryModelsUntilSuccess(
        client,
        [modelUsed, ...modelsToTry.filter(m => m !== modelUsed)],
        async (model) => {
          return await client.chat.completions.create({
            model,
            messages: openAIMessages,
            tools: [weatherTool],
            tool_choice: "auto",
            stream: false,
          });
        }
      );
      
      assistantMessage = nextResponse.choices[0].message;
    }

    // Update the stored messages
    threadMessages.push(userMessage);
    threadMessages.push(assistantMessage);

    // NOW stream with proper Crayon format (use same successful model)
    const { response: llmStream } = await tryModelsUntilSuccess(
      client,
      [modelUsed, ...modelsToTry.filter(m => m !== modelUsed)],
      async (model) => {
        return await client.chat.completions.create({
          model,
          messages: openAIMessages,
          stream: true,
          response_format: templatesToResponseFormat(),
        });
      }
    );

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
    
    const availableCount = getAvailableModels().length;
    const errorMessage = availableCount === 0
      ? "All AI models are temporarily rate-limited. Please try again in a few minutes."
      : error.message || "An error occurred processing your request";

    // Return error as JSON
    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.status === 429 
          ? `${availableCount}/${ALL_FREE_MODELS.length} models still available. The system will automatically retry.`
          : "Please check your API key and try again.",
        availableModels: availableCount
      },
      { status: error.status || 500 }
    );
  }
}
