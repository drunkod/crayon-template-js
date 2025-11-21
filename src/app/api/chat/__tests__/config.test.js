/**
 * @jest-environment node
 */

// ⚠️ DO NOT import at top level - we need dynamic imports for env var testing
const mockGoogleGenAI = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: mockGoogleGenAI,
}));

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockGoogleGenAI.mockClear();

    // Mock implementation returns object with models property
    mockGoogleGenAI.mockImplementation((config) => ({
      apiKey: config.apiKey,
      models: {
        generateContentStream: jest.fn(),
      },
    }));
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe("getAiProvider", () => {
    it("should return OPENROUTER by default", () => {
      delete process.env.AI_PROVIDER;
      delete process.env.NEXT_PUBLIC_AI_PROVIDER;

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.OPENROUTER);
    });

    it("should return GEMINI when AI_PROVIDER is set to gemini", () => {
      process.env.AI_PROVIDER = "gemini";

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
    });

    it("should return GEMINI when NEXT_PUBLIC_AI_PROVIDER is set to gemini", () => {
      delete process.env.AI_PROVIDER;
      process.env.NEXT_PUBLIC_AI_PROVIDER = "gemini";

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
    });

    it("should be case-insensitive", () => {
      process.env.AI_PROVIDER = "GeMiNi";

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
    });

    it("should trim whitespace", () => {
      process.env.AI_PROVIDER = "  gemini  ";

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
    });

    it("should return OPENROUTER for an invalid provider", () => {
      process.env.AI_PROVIDER = "invalid-provider";

      const { getAiProvider, PROVIDERS } = require("../config");
      expect(getAiProvider()).toBe(PROVIDERS.OPENROUTER);
    });
  });

  describe("createGeminiClient", () => {
    it("throws error if GEMINI_API_KEY is missing", () => {
      delete process.env.GEMINI_API_KEY;

      const { createGeminiClient } = require("../config");

      expect(() => createGeminiClient()).toThrow("Missing GEMINI_API_KEY");
    });

    it("instantiates GoogleGenAI with API key object", () => {
      process.env.GEMINI_API_KEY = "test-secret-key";

      const { createGeminiClient } = require("../config");
      createGeminiClient();

      expect(mockGoogleGenAI).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI).toHaveBeenCalledWith({
        apiKey: "test-secret-key",
      });
    });

    it("returns client instance with models property", () => {
      process.env.GEMINI_API_KEY = "test-key";

      const { createGeminiClient } = require("../config");
      const client = createGeminiClient();

      expect(client).toBeDefined();
      expect(client.models).toBeDefined();
      expect(client.models.generateContentStream).toBeDefined();
    });
  });
});
