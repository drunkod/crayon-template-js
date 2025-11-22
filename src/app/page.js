'use client';
import dynamic from 'next/dynamic';
import { WeatherCard } from './components/WeatherCard';
import { DebugPanel } from './components/DebugPanel';
import { EnvStatus } from './components/EnvStatus';
import { apiDebug } from '@/lib/debug';
import {
  getAiProvider,
  isMockAI,
  getMockAIResponse,
  callOpenRouter,
  callGemini,
  PROVIDERS
} from '@/lib/aiClient';
import { getWeather, extractLocation } from '@/lib/weatherClient';

const CrayonChat = dynamic(
  () => import('@crayonai/react-ui').then(mod => mod.CrayonChat),
  { ssr: false }
);

// ============================================================================
// CLIENT-SIDE MESSAGE PROCESSOR
// ============================================================================

const processMessage = async ({ messages, abortController }) => {
  apiDebug.log('📤 Processing message (CLIENT-SIDE)', {
    messageCount: messages.length 
  });

  try {
    const lastMessage = messages[messages.length - 1];
    const text = lastMessage?.content || lastMessage?.text || "";

    // 1️⃣ Check for weather query
    const location = extractLocation(text);
    if (location) {
      apiDebug.log(`Weather query detected: ${location}`);
      const weather = await getWeather(location);

      // Return SSE-compatible stream
      return createWeatherStream(weather);
    }
    
    // 2️⃣ Check for mock mode
    if (isMockAI()) {
      apiDebug.log("Using MOCK AI");
      const mockResponse = await getMockAIResponse(messages);
      return createMockStream(mockResponse);
    }

    // 3️⃣ Call real AI provider
    const provider = getAiProvider();
    apiDebug.log(`Using AI provider: ${provider}`);

    if (provider === PROVIDERS.GEMINI) {
      const geminiStream = await callGemini(messages);
      return createGeminiStream(geminiStream);
    } else {
      const openRouterStream = await callOpenRouter(messages);
      return createOpenRouterStream(openRouterStream);
    }
    
  } catch (error) {
    apiDebug.error('Client-side AI error', error);
    throw error;
  }
};

// ============================================================================
// STREAM CREATORS
// ============================================================================

function createWeatherStream(weatherData) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      const event = `event: tpl\ndata: ${JSON.stringify({
        name: "weather",
        templateProps: weatherData
      })}\n\n`;

      controller.enqueue(encoder.encode(event));
      controller.close();
    }
  });
}

function createMockStream(response) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      if (response.type === "weather") {
        const event = `event: tpl\ndata: ${JSON.stringify({
          name: "weather",
          templateProps: response.data
        })}\n\n`;
        controller.enqueue(encoder.encode(event));
      } else {
        const event = `event: text\ndata: ${response.data}\n\n`;
        controller.enqueue(encoder.encode(event));
      }
      controller.close();
    }
  });
}

function createGeminiStream(geminiResult) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiResult) {
          const text = chunk.text;
          if (text) {
            const event = `event: text\ndata: ${text}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

function createOpenRouterStream(completion) {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            const event = `event: text\ndata: ${content}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Home() {
  return (
    <>
      <EnvStatus />
      <CrayonChat
        processMessage={processMessage}
        responseTemplates={[
          {
            name: "weather",
            Component: WeatherCard,
          },
        ]}
      />
      <DebugPanel />
    </>
  );
}
