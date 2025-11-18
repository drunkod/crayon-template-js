import { NextResponse } from "next/server";
import OpenAI from "openai";
import { fromOpenAICompletion } from "@crayonai/stream";
import { getMockCompletion } from "./mockOpenRouter";
import { apiDebug, aiDebug, streamDebug } from "@/lib/debug";

const FREE_MODELS = [
  "deepseek/deepseek-r1:free",
  "google/gemini-2.0-flash-exp:free",
  "qwen/qwen-2.5-72b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
];

const SYSTEM_PROMPT = `You are a helpful AI assistant.

When users ask about weather, respond with structured JSON in this exact format:
{
  "response": [
    {
      "type": "template",
      "name": "weather",
      "templateProps": {
        "location": "CityName",
        "country": "Country",
        "temperature": 22,
        "feelsLike": 20,
        "humidity": 65,
        "windSpeed": 15,
        "condition": "Partly Cloudy",
        "icon": "⛅",
        "high": 25,
        "low": 18,
        "timestamp": "${new Date().toISOString()}"
      }
    }
  ]
}

For other questions, respond with plain text.

Weather icons: ☀️ (sunny), ⛅ (partly cloudy), ☁️ (cloudy), 🌧️ (rainy), ⛈️ (stormy), 🌨️ (snowy), 🌫️ (foggy)`;

// Mock SSE stream for offline mode
function createMockSseStream(content, isWeather = false) {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    start(controller) {
      try {
        if (isWeather) {
          // Send template event
          const tplEvent = `event: tpl\ndata: ${JSON.stringify({
            name: "weather",
            templateProps: content
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

export async function POST(req) {
  const requestId = Math.random().toString(36).substring(7);
  apiDebug.log(`📨 New request [${requestId}]`);

  try {
    const { messages } = await req.json();
    
    // 🔧 Better debug logging
    const last = messages[messages.length - 1];
    let preview = '';

    if (last) {
      if (typeof last.content === 'string') {
        preview = last.content.slice(0, 50);
      } else if (Array.isArray(last.content)) {
        preview = JSON.stringify(last.content).slice(0, 80);
      } else if (typeof last.text === 'string') {
        preview = last.text.slice(0, 50);
      } else {
        preview = JSON.stringify(last).slice(0, 80);
      }
    } else {
      preview = '[No messages]';
    }

    apiDebug.log(`Messages received`, { 
      count: messages.length, 
      lastMessage: preview,
      fullLastMessage: last, // See the full structure
    });
    
    // MOCK MODE - Simple offline responses
    if (process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER === "true") {
      aiDebug.log("🎭 Using MOCK OpenRouter");
      
      const aiResponse = await getMockCompletion(messages);
      aiDebug.success("Mock response generated", { preview: aiResponse.substring(0, 100) });
      
      // Try to parse as weather JSON
      let weatherData = null;
      try {
        const parsed = JSON.parse(aiResponse);
        // Check if it has weather data structure
        if (parsed.location && typeof parsed.temperature === 'number') {
          weatherData = parsed;
          aiDebug.log("✅ Detected weather data", { location: parsed.location });
        }
      } catch (e) {
        // Not JSON, treat as text
        aiDebug.log("Response is text, not JSON");
      }
      
      if (weatherData) {
        // Remove template field if present
        const { template, ...cleanWeatherData } = weatherData;
        
        return new NextResponse(createMockSseStream(cleanWeatherData, true), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      } else {
        return new NextResponse(createMockSseStream(aiResponse, false), {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      }
    }

    // REAL OPENROUTER MODE - Use proper streaming
    aiDebug.log("🌐 Using REAL OpenRouter API");
    
    const client = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
        "X-Title": "Weather Chat App",
      },
    });

    const messagesWithSystem = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages
    ];

    let lastError = null;
    
    for (let i = 0; i < FREE_MODELS.length; i++) {
      const model = FREE_MODELS[i];
      aiDebug.log(`Trying model [${i + 1}/${FREE_MODELS.length}]: ${model}`);
      
      try {
        // Create streaming completion
        const completion = await client.chat.completions.create({
          model,
          messages: messagesWithSystem,
          stream: true, // Enable streaming
          temperature: 0.7,
          max_tokens: 500,
        });

        aiDebug.success(`Model worked: ${model}, streaming response`);
        
        // Use fromOpenAICompletion to convert to Crayon SSE format
        const responseStream = fromOpenAICompletion(completion);
        
        return new NextResponse(responseStream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });

      } catch (error) {
        aiDebug.warn(`Model failed: ${model}`, { 
          status: error.status, 
          message: error.message?.substring(0, 80) 
        });
        lastError = error;
        
        if (error.status === 429 || error.status === 404 || error.status === 503) {
          continue;
        }
        
        continue;
      }
    }

    aiDebug.error(`All ${FREE_MODELS.length} models failed`, lastError);
    
    return NextResponse.json(
      { 
        error: `All ${FREE_MODELS.length} free models failed`,
        message: "Please try again in a few moments",
        attemptedModels: FREE_MODELS.length,
      },
      { status: 503 }
    );
  } catch (error) {
    apiDebug.error("Route error", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}