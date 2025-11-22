import { SSE_HEADERS } from '@/lib/utils/config';
import { logger } from '@/lib/utils/debug';

const encoder = new TextEncoder();

/**
 * Create SSE event string
 */
function createEvent(type, data) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create weather template stream
 */
export function createWeatherStream(weatherData) {
  const stream = new ReadableStream({
    start(controller) {
      const event = createEvent('tpl', {
        name: 'weather',
        templateProps: weatherData,
      });
      controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Create text stream
 */
export function createTextStream(text) {
  const stream = new ReadableStream({
    start(controller) {
      const event = createEvent('text', text);
      controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Create Gemini response stream
 */
export function createGeminiStream(geminiResult) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of geminiResult) {
          if (chunk.text) {
            const event = `event: text\ndata: ${chunk.text}\n\n`;
            controller.enqueue(encoder.encode(event));
          }
        }
        controller.close();
        logger.stream.success('Gemini stream completed');
      } catch (error) {
        logger.stream.error('Gemini stream error', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

/**
 * Create OpenRouter response stream
 */
export function createOpenRouterStream(completion) {
  const stream = new ReadableStream({
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
        logger.stream.success('OpenRouter stream completed');
      } catch (error) {
        logger.stream.error('OpenRouter stream error', error);
        controller.error(error);
      }
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
