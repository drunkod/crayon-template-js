import { GoogleGenAI } from '@google/genai';
import { logger } from '@/lib/utils/debug';
import { SYSTEM_PROMPT } from '@/lib/utils/config';

/**
 * Create Gemini client
 */
export function createGeminiClient() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY');
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Extract text from various message formats
 */
function extractText(msg) {
  if (typeof msg.content === 'string') return msg.content;

  if (Array.isArray(msg.content)) {
    return msg.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text') return part.text;
        if (part?.text) return part.text;
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return msg.message || msg.text || String(msg.content || '');
}

/**
 * Convert messages to Gemini format
 */
function toGeminiFormat(messages) {
  return messages
    .map((msg) => {
      const text = extractText(msg).trim();
      if (!text) return null;

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text }],
      };
    })
    .filter(Boolean);
}

/**
 * Call Gemini API with streaming
 */
export async function callGemini(messages) {
  const client = createGeminiClient();
  const contents = toGeminiFormat(messages);

  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash-exp';
  const temperature = parseFloat(process.env.NEXT_PUBLIC_GEMINI_TEMPERATURE || '0.7');

  logger.ai.log(`Calling Gemini: ${model}`, { messageCount: contents.length });

  try {
    const result = await client.models.generateContentStream({
      model,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature,
      },
    });

    logger.ai.success('Gemini connected');
    return result;
  } catch (error) {
    logger.ai.error('Gemini API error', {
      message: error.message,
      code: error.code,
    });
    throw error;
  }
}
