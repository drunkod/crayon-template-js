import { extractLocation } from '../weatherClient';

describe('extractLocation', () => {
  it('should extract location from "weather in London"', () => {
    expect(extractLocation('weather in London')).toBe('london');
  });

  it('should extract location from "what is the weather in new york?"', () => {
    expect(extractLocation('what is the weather in new york?')).toBe('new york');
  });

  it('should return null for "hello world"', () => {
    expect(extractLocation('hello world')).toBeNull();
  });

  it('should handle "weather for Paris"', () => {
    expect(extractLocation('weather for Paris')).toBe('paris');
  });

  it('should handle "tokyo weather"', () => {
    expect(extractLocation('tokyo weather')).toBe('tokyo');
  });

  it('should return null for an empty string', () => {
    expect(extractLocation('')).toBeNull();
  });

  it('should return null for a non-string input', () => {
    expect(extractLocation(null)).toBeNull();
    expect(extractLocation(undefined)).toBeNull();
    expect(extractLocation(123)).toBeNull();
  });
});
