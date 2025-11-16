import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";
import { weatherTool, executeWeatherTool } from "./tools";
import { systemPrompt, systemPromptNoTools } from "./systemPrompt";

// In-memory message store (per thread)
const messageStore = new Map();

// Models that support tool calling (very few free ones do!)
const TOOL_CAPABLE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-flash-1.5-8b:free",
];

// All other free models - will use direct responses
const NON_TOOL_MODELS = [
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "qwen/qwen-2.5-coder-32b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "mistralai/mistral-nemo:free",
  "mistralai/mistral-7b-instruct:free",
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

// Mark model as failed
function markModelFailed(model) {
  failedModels.set(model, Date.now());
  console.log(`Marked ${model} as failed. Cooling down for 5 minutes.`);
}

// Extract location from user message
function extractLocation(message) {
  // Add validation for undefined/null/non-string input
  if (!message || typeof message !== 'string') {
    return null;
  }
  const text = message.toLowerCase();
  // Common patterns
  const patterns = [
    /weather (?:in|for|at) ([a-z\s]+?)(?:\?|$|\.)/,
    /(?:what's|what is|how's|how is) (?:the )?weather (?:in|at|for) ([a-z\s]+?)(?:\?|$|\.)/,
    /(?:in|at|for) ([a-z\s]+?) weather/,
    /^([a-z\s]+?) weather$/,
    /weather: ([a-z\s]+)/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  // Fallback: look for city names (common ones)
  const cities = ['paris', 'london', 'tokyo', 'new york', 'sydney', 'berlin', 'moscow', 'beijing', 'mumbai', 'dubai'];
  for (const city of cities) {
    if (text.includes(city)) {
      return city;
    }
  }
  return null;
}

// Try models with tools
async function tryWithTools(client, models, messages) {
  const availableModels = models.filter(m => !failedModels.has(m));

  for (const model of availableModels) {
    try {
      console.log(`[TOOLS] Trying ${model}...`);

      const response = await client.chat.completions.create({
        model,
        messages,
        tools: [weatherTool],
        tool_choice: "auto",
        stream: false,
        temperature: 0.7,
      });

      console.log(`✓ Success with ${model} (with tools)`);
      return { response, modelUsed: model, usedTools: true };
    } catch (error) {
      console.log(`✗ ${model} failed: ${error.message}`);
      if (error.status === 429 || error.message?.includes("rate")) {
        markModelFailed(model);
      }
    }
  }

  return null;
}

// Try models without tools (direct weather data injection)
async function tryWithoutTools(client, models, messages, userMessage) {
  const availableModels = models.filter(m => !failedModels.has(m));

  // Try to extract location and fetch weather
  const location = extractLocation(userMessage.content);
  let weatherData = null;

  if (location) {
    try {
      weatherData = await executeWeatherTool({ location });
      console.log(`Fetched weather for ${location}`);
    } catch (error) {
      console.log(`Failed to fetch weather: ${error.message}`);
    }
  }

  // Modify messages to include weather data if available
  const modifiedMessages = [...messages];
  if (weatherData) {
    modifiedMessages.push({
      role: "system",
      content: `Weather data for ${location}: ${weatherData}\n\nRespond ONLY with this exact JSON, no additional text.`
    });
  }

  for (const model of availableModels) {
    try {
      console.log(`[NO-TOOLS] Trying ${model}...`);

      const response = await client.chat.completions.create({
        model,
        messages: modifiedMessages,
        stream: false,
        temperature: 0.3,
      });

      console.log(`✓ Success with ${model} (without tools)`);
      return { response, modelUsed: model, usedTools: false };
    } catch (error) {
      console.log(`✗ ${model} failed: ${error.message}`);
      if (error.status === 429 || error.message?.includes("rate")) {
        markModelFailed(model);
      }
    }
  }

  return null;
}

export async function POST(req) {
  try {
    const { messages, threadId } = await req.json();
    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }
    const userMessage = messages[messages.length - 1];
    if (!userMessage || !userMessage.content) {
      return NextResponse.json(
        { error: "Invalid message format" },
        { status: 400 }
      );
    }

    // Initialize thread if needed
    if (!messageStore.has(threadId)) {
      messageStore.set(threadId, []);
    }
    const threadMessages = messageStore.get(threadId);
    
    // Configure OpenAI client for OpenRouter
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_API_BASE,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
        "X-Title": "Crayon Weather App",
      },
    });

    cleanupFailedModels();

    // Build conversation messages
    let conversationMessages = [
      { role: "system", content: systemPromptNoTools },
      ...threadMessages,
      userMessage
    ];

    let result = null;

    // First, try tool-capable models (if any are available)
    if (TOOL_CAPABLE_MODELS.some(m => !failedModels.has(m))) {
      conversationMessages[0].content = systemPrompt; // Use tool-aware prompt
      result = await tryWithTools(client, TOOL_CAPABLE_MODELS, conversationMessages);
    }

    // If tools failed or no tool models available, try without tools
    if (!result) {
      conversationMessages[0].content = systemPromptNoTools;
      result = await tryWithoutTools(client, NON_TOOL_MODELS, conversationMessages, userMessage);
    }

    if (!result) {
      throw new Error("All models are currently unavailable. Please try again in a few minutes.");
    }

    let { response, modelUsed, usedTools } = result;
    let assistantMessage = response.choices[0].message;

    // Handle tool calls if present
    if (usedTools && assistantMessage.tool_calls?.length > 0) {
      const toolMessages = [...conversationMessages];

      while (assistantMessage.tool_calls?.length > 0) {
        toolMessages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
          const functionArgs = JSON.parse(toolCall.function.arguments);
          const functionResponse = await executeWeatherTool(functionArgs);

          toolMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: functionResponse,
          });
        }

        const nextResponse = await client.chat.completions.create({
          model: modelUsed,
          messages: toolMessages,
          stream: false,
        });

        assistantMessage = nextResponse.choices[0].message;
      }
    }

    // Update stored messages
    threadMessages.push(userMessage);
    threadMessages.push({
      role: "assistant",
      content: assistantMessage.content
    });

    // Stream the final response
    const llmStream = await client.chat.completions.create({
      model: modelUsed,
      messages: [...conversationMessages, assistantMessage],
      stream: true,
      response_format: templatesToResponseFormat(),
    });

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
    
    return NextResponse.json(
      { 
        error: error.message || "An error occurred processing your request",
        details: "All available models are currently rate-limited or unavailable. Please try again in a few moments."
      },
      { status: error.status || 500 }
    );
  }
}
