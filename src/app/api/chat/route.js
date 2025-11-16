import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";
import { weatherTool, executeWeatherTool } from "./tools";
import { systemPrompt, systemPromptNoTools } from "./systemPrompt";
import { extractLocation } from './locationUtils';

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

// Mock OpenRouter mode
async function handleMockMode(userMessage, threadMessages) {
  console.log('[MOCK MODE] Using mock OpenRouter');

  const location = extractLocation(userMessage.content);

  if (!location) {
    // No location found - ask for one
    const response = "I'd be happy to help you with weather information! Which city would you like to know about?";

    async function* generateStream() {
      // Stream the entire text response at once to avoid JSON parsing confusion
      yield {
        choices: [{
          delta: { content: response },
          index: 0,
          finish_reason: null
        }]
      };
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        choices: [{
          delta: {},
          index: 0,
          finish_reason: 'stop'
        }]
      };
    }

    return { stream: generateStream(), content: response };
  }

  // Fetch weather and return as JSON
  try {
    const weatherData = await executeWeatherTool({ location });

    async function* generateWeatherStream() {
      // Stream the JSON all at once to ensure proper parsing
      await new Promise(resolve => setTimeout(resolve, 300));
      yield {
        choices: [{
          delta: { content: weatherData },
          index: 0,
          finish_reason: null
        }]
      };
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        choices: [{
          delta: {},
          index: 0,
          finish_reason: 'stop'
        }]
      };
    }

    return { stream: generateWeatherStream(), content: weatherData };
  } catch (error) {
    console.error('Mock weather fetch failed:', error);
    const errorMsg = `Sorry, I couldn't fetch the weather for ${location}. Please try another city.`;

    async function* generateErrorStream() {
      // Stream entire error message at once
      yield {
        choices: [{
          delta: { content: errorMsg },
          index: 0,
          finish_reason: null
        }]
      };
      await new Promise(resolve => setTimeout(resolve, 50));
      yield {
        choices: [{
          delta: {},
          index: 0,
          finish_reason: 'stop'
        }]
      };
    }

    return { stream: generateErrorStream(), content: errorMsg };
  }
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
    const body = await req.json();
    const { messages, threadId } = body;

    // Validate input with better error messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('Invalid messages:', messages);
      return NextResponse.json(
        { error: "No messages provided" },
        { status: 400 }
      );
    }

    const userMessage = messages[messages.length - 1];

    // More flexible validation - check for content in different formats
    const messageContent = userMessage?.content || userMessage?.text || userMessage?.message;

    if (!messageContent) {
      console.error('Invalid message format:', userMessage);
      return NextResponse.json(
        { error: "Invalid message format - no content found" },
        { status: 400 }
      );
    }

    // Normalize the message
    const normalizedMessage = {
      role: userMessage.role || 'user',
      content: messageContent
    };

    // Initialize thread if needed
    if (!threadId || !messageStore.has(threadId)) {
      messageStore.set(threadId || 'default', []);
    }

    const threadMessages = messageStore.get(threadId || 'default');

    // Check if we should use mock mode
    const useMockMode = process.env.USE_MOCK_OPENROUTER === "true" ||
                        !process.env.OPENROUTER_API_KEY ||
                        process.env.OPENROUTER_API_KEY === "your_openrouter_api_key_here";

    if (useMockMode) {
      const mockResult = await handleMockMode(normalizedMessage, threadMessages);

      // Update stored messages
      threadMessages.push(normalizedMessage);
      threadMessages.push({
        role: "assistant",
        content: mockResult.content
      });

      // Convert async generator to stream
      const responseStream = fromOpenAICompletion(mockResult.stream);

      return new NextResponse(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }
    
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
      normalizedMessage
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
      result = await tryWithoutTools(client, NON_TOOL_MODELS, conversationMessages, normalizedMessage);
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
    threadMessages.push(normalizedMessage);
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
