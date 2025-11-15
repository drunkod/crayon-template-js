import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  fromOpenAICompletion,
  toOpenAIMessages,
  templatesToResponseFormat,
} from "@crayonai/stream";

export async function POST(req) {
  const { messages } = await req.json();
  
  // Configure OpenAI client to use OpenRouter
  const client = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: process.env.OPENROUTER_API_BASE,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL,
      "X-Title": "Crayon Chat",
    },
  });

  const llmStream = await client.chat.completions.create({
    model: process.env.OPENROUTER_MODEL || "kwaipilot/kat-coder-pro:free",
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