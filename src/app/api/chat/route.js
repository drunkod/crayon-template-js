import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";
import { weatherTool, executeWeatherTool } from "./tools";
import { WeatherSchema } from "./weatherSchema";

// Free models to try in order
const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "deepseek/deepseek-chat-v3.1:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

export async function POST(req) {
  const { messages } = await req.json();
  
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:4000",
      "X-Title": "Weather App",
    },
  });

  // Try each model until one works
  let lastError = null;
  
  for (const model of FREE_MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      
      const llmStream = await client.chat.completions.create({
        model,
        messages: toOpenAIMessages(messages),
        tools: [weatherTool],
        stream: true,
        // response_format: templatesToResponseFormat({
        //   schema: WeatherSchema,
        //   name: "weather",
        //   description: "Use this template to display weather information",
        // }),
      });

      console.log(`✓ Success with ${model}`);
      const responseStream = fromOpenAICompletion(llmStream);

      return new NextResponse(responseStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      console.log(`✗ ${model} failed:`, error.message);
      lastError = error;
      
      // If rate limited, try next model
      if (error.status === 429) {
        continue;
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  // If all models failed, return error
  console.error("All models failed. Last error:", lastError);
  return NextResponse.json(
    { 
      error: "All available models are currently rate-limited",
      message: "Please try again in a few moments or add your own API key at https://openrouter.ai/settings/integrations"
    },
    { status: 503 }
  );
}