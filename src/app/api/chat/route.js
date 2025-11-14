import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";

export async function POST(req) {
  const { messages } = await req.json();
  const client = new OpenAI({
    baseURL: process.env.OPENROUTER_API_BASE,
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
      "X-Title": "Crayon Template JS",
    },
  });
  const llmStream = await client.chat.completions.create({
    model: "openai/gpt-3.5-turbo",
    messages: toOpenAIMessages(messages),
    stream: true,
    response_format: templatesToResponseFormat(),
  });
  const responseStream = fromOpenAICompletion(llmStream);
  return new NextResponse(responseStream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
