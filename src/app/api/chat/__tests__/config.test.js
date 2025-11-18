/**
 * @jest-environment node
 */
import { getAiProvider, PROVIDERS } from "../config";

describe("getAiProvider", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("should return OPENROUTER by default", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.NEXT_PUBLIC_AI_PROVIDER;
    expect(getAiProvider()).toBe(PROVIDERS.OPENROUTER);
  });

  it("should return GEMINI when AI_PROVIDER is set to gemini", () => {
    process.env.AI_PROVIDER = "gemini";
    expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
  });

  it("should return GEMINI when NEXT_PUBLIC_AI_PROVIDER is set to gemini", () => {
    delete process.env.AI_PROVIDER;
    process.env.NEXT_PUBLIC_AI_PROVIDER = "gemini";
    expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
  });

  it("should be case-insensitive", () => {
    process.env.AI_PROVIDER = "GeMiNi";
    expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
  });

  it("should trim whitespace", () => {
    process.env.AI_PROVIDER = "  gemini  ";
    expect(getAiProvider()).toBe(PROVIDERS.GEMINI);
  });

  it("should return OPENROUTER for an invalid provider", () => {
    process.env.AI_PROVIDER = "invalid-provider";
    expect(getAiProvider()).toBe(PROVIDERS.OPENROUTER);
  });
});
