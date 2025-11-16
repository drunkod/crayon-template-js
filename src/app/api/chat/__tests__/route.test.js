/** @jest-environment node */

import { POST } from '../route'
import { ReadableStream } from 'stream/web'

// Helper to create a mock request
const createMockRequest = (body) => ({
  json: async () => body,
});

// Mock the tools
jest.mock('../tools', () => ({
  executeWeatherTool: jest.fn(async ({ location }) => {
    return JSON.stringify({
      location: location.charAt(0).toUpperCase() + location.slice(1),
      country: 'Test Country',
      temperature: 20,
      feelsLike: 19,
      humidity: 70,
      windSpeed: 10,
      precipitation: 0,
      condition: 'Clear sky',
      icon: '☀️',
      high: 22,
      low: 18,
      timestamp: new Date().toISOString(),
    })
  }),
  weatherTool: {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get weather',
      parameters: {},
    },
  },
}));

// Mock the stream utility
jest.mock('@crayonai/stream', () => ({
  fromOpenAICompletion: (stream) => new ReadableStream({
    start(controller) {
      // Simple mock: just push a single chunk and close
      controller.enqueue('mock stream content');
      controller.close();
    }
  }),
  toOpenAIMessages: jest.fn(),
  templatesToResponseFormat: jest.fn(),
}));


describe('Chat API Route', () => {
  it('returns 400 for empty messages', async () => {
    const request = createMockRequest({ messages: [], threadId: 'test' });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for messages without content', async () => {
    const request = createMockRequest({
      messages: [{ role: 'user' }],
      threadId: 'test',
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('handles valid message with location (mock mode)', async () => {
    const request = createMockRequest({
      messages: [{ role: 'user', content: 'weather in Paris' }],
      threadId: 'test-thread',
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
  });

  it('handles message without location (mock mode)', async () => {
    const request = createMockRequest({
      messages: [{ role: 'user', content: 'hello' }],
      threadId: 'test-thread-2',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
