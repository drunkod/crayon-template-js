/** @jest-environment node */
import { POST } from '../route'

// Helper to create a mock NextRequest-like object
const createMockRequest = (body) => ({
  json: async () => body,
})

describe('Chat API Route (mock mode)', () => {
  beforeAll(() => {
    // Ensure we are in mock mode for these tests
    process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER = 'true'
    process.env.NEXT_PUBLIC_DEBUG_MODE = 'false'
  })

  it('returns weather SSE for weather query with location', async () => {
    const request = createMockRequest({
      threadId: 'test-thread',
      messages: [{ role: 'user', content: 'weather in Paris' }],
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')

    const body = await response.text()

    // Basic SSE structure
    expect(body).toContain('event: tpl')
    expect(body).toContain('"name":"weather"')

    // Location should be Paris (case-insensitive check)
    expect(body.toLowerCase()).toContain('"location":"paris"')
  })

  it('returns text SSE for non-weather query', async () => {
    const request = createMockRequest({
      threadId: 'test-thread-2',
      messages: [{ role: 'user', content: 'hello there' }],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')

    const body = await response.text()
    expect(body).toContain('event: text')
  })

  it('handles empty messages gracefully in mock mode', async () => {
    const request = createMockRequest({
      threadId: 'test-thread-3',
      messages: [],
    })

    const response = await POST(request)
    // Current implementation returns 200 with a text event
    expect(response.status).toBe(200)
    const body = await response.text()
    expect(body).toContain('event: text')
  })
})
