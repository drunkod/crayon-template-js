import { extractLocation } from '../locationUtils';

describe('Location Extraction', () => {
  it('extracts location from "weather in Paris"', () => {
    expect(extractLocation('weather in Paris')).toBe('paris')
  })

  it('extracts location from "What\'s the weather in Tokyo?"', () => {
    expect(extractLocation("What's the weather in Tokyo?")).toBe('tokyo')
  })

  it('extracts location from "How is the weather in London"', () => {
    expect(extractLocation('How is the weather in London')).toBe('london')
  })

  it('extracts location from "Paris weather"', () => {
    expect(extractLocation('Paris weather')).toBe('paris')
  })

  it('extracts location from "in New York weather"', () => {
    expect(extractLocation('in New York weather')).toBe('new york')
  })

  it('extracts location from "weather: Tokyo"', () => {
    expect(extractLocation('weather: Tokyo')).toBe('tokyo')
  })

  it('extracts location from message containing city name', () => {
    expect(extractLocation('Tell me about Paris')).toBe('paris')
    expect(extractLocation('How is Tokyo today?')).toBe('tokyo')
  })

  it('returns null for messages without location', () => {
    expect(extractLocation('Hello')).toBe(null)
    expect(extractLocation('How are you?')).toBe(null)
  })

  it('returns null for undefined or null input', () => {
    expect(extractLocation(null)).toBe(null)
    expect(extractLocation(undefined)).toBe(null)
  })

  it('returns null for non-string input', () => {
    expect(extractLocation(123)).toBe(null)
    expect(extractLocation({})).toBe(null)
  })

  it('handles case insensitivity', () => {
    expect(extractLocation('WEATHER IN PARIS')).toBe('paris')
    expect(extractLocation('Weather In TOKYO')).toBe('tokyo')
  })
})
