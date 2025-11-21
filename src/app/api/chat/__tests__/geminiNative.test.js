/**
 * @jest-environment node
 */
import { callGeminiNative, geminiStreamToSSE } from "../geminiNative";
import { SYSTEM_PROMPT } from "../config";

jest.mock("../config", () => {
  const originalModule = jest.requireActual("../config");
  return {
    ...originalModule,
    createGeminiClient: jest.fn(),
    GEMINI_MODEL: "mock-gemini-model",
  };
});

jest.mock("@/lib/debug", () => ({
  aiDebug: {
    log: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

import { createGeminiClient } from "../config";

describe("geminiNative", () => {
  describe("callGeminiNative", () => {
    let mockGenerateContentStream;
    let mockClient;

    beforeEach(() => {
      mockGenerateContentStream = jest.fn().mockResolvedValue([]);
      mockClient = {
        models: {
          generateContentStream: mockGenerateContentStream,
        },
      };
      createGeminiClient.mockReturnValue(mockClient);
    });

    it("calls generateContentStream with correct model", async () => {
      const messages = [{ role: "user", content: "Hello" }];
      await callGeminiNative(messages);

      expect(mockGenerateContentStream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mock-gemini-model",
        }),
      );
    });

    it("passes system instruction in config", async () => {
      const messages = [{ role: "user", content: "Hello" }];
      await callGeminiNative(messages);

      const callArgs = mockGenerateContentStream.mock.calls[0][0];

      expect(callArgs.config).toBeDefined();
      expect(callArgs.config.systemInstruction).toBe(SYSTEM_PROMPT);
      expect(callArgs.config.temperature).toBe(0.7);
    });

    it("converts messages to Gemini format without prepending system prompt", async () => {
      const messages = [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ];

      await callGeminiNative(messages);

      const contents = mockGenerateContentStream.mock.calls[0][0].contents;

      // System prompt should NOT be in contents (it's in config now)
      expect(contents).toHaveLength(2);
      expect(contents[0]).toEqual({
        role: "user",
        parts: [{ text: "Hello" }],
      });
      expect(contents[1]).toEqual({
        role: "model",
        parts: [{ text: "Hi there" }],
      });
    });

    it("handles different message content formats", async () => {
      const messages = [
        { role: "user", content: "String content" },
        { role: "user", message: "Message field" },
        { role: "user", text: "Text field" },
      ];

      await callGeminiNative(messages);

      const contents = mockGenerateContentStream.mock.calls[0][0].contents;

      expect(contents[0].parts[0].text).toBe("String content");
      expect(contents[1].parts[0].text).toBe("Message field");
      expect(contents[2].parts[0].text).toBe("Text field");
    });

    it("skips messages with empty content", async () => {
      const messages = [
        { role: "user", content: "" },
        { role: "user", content: "Valid" },
        { role: "user", message: "" },
      ];

      await callGeminiNative(messages);

      const contents = mockGenerateContentStream.mock.calls[0][0].contents;

      expect(contents).toHaveLength(1);
      expect(contents[0].parts[0].text).toBe("Valid");
    });

    it("converts assistant role to model role", async () => {
      const messages = [
        { role: "assistant", content: "Assistant message" },
        { role: "system", content: "System message" },
      ];

      await callGeminiNative(messages);

      const contents = mockGenerateContentStream.mock.calls[0][0].contents;

      expect(
        contents.find((c) => c.parts[0].text === "Assistant message").role,
      ).toBe("model");
      expect(
        contents.find((c) => c.parts[0].text === "System message").role,
      ).toBe("user");
    });

    it("throws descriptive error if SDK call fails", async () => {
      const sdkError = new Error("Network Error");
      sdkError.status = 503;
      mockGenerateContentStream.mockRejectedValue(sdkError);

      await expect(callGeminiNative([])).rejects.toThrow(
        "Gemini SDK error: Network Error",
      );
    });
  });

  describe("geminiStreamToSSE", () => {
    it("converts SDK async iterable to SSE format", async () => {
      // Mock the new SDK format: direct async iterable with .text property
      const mockStreamData = [{ text: "Hello" }, { text: " World" }];

      const mockGeminiStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamData) {
            yield chunk;
          }
        },
      };

      const stream = geminiStreamToSSE(mockGeminiStream);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).toContain("event: text\ndata: Hello\n\n");
      expect(result).toContain("event: text\ndata:  World\n\n");
    });

    it("skips empty text chunks gracefully", async () => {
      const mockStreamData = [{ text: "" }, { text: "Valid" }];

      const mockGeminiStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of mockStreamData) {
            yield chunk;
          }
        },
      };

      const stream = geminiStreamToSSE(mockGeminiStream);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
      }

      expect(result).not.toContain("event: text\ndata: \n\n");
      expect(result).toContain("data: Valid\n\n");
    });

    it("handles stream errors gracefully", async () => {
      const mockGeminiStream = {
        [Symbol.asyncIterator]: async function* () {
          yield { text: "Start" };
          throw new Error("Stream interrupted");
        },
      };

      const stream = geminiStreamToSSE(mockGeminiStream);
      const reader = stream.getReader();

      // Should get first chunk
      const { value } = await reader.read();
      expect(new TextDecoder().decode(value)).toContain("Start");

      // Then error
      await expect(reader.read()).rejects.toThrow("Stream interrupted");
    });
  });
});
