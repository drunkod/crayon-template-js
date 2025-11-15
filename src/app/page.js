'use client';
import dynamic from 'next/dynamic';

// Dynamically import CrayonChat to avoid SSR hydration issues
const CrayonChat = dynamic(
  () => import("@crayonai/react-ui").then(mod => ({ default: mod.CrayonChat })),
  { ssr: false }
);

import "@crayonai/react-ui/styles/index.css";

const processMessage = async ({ threadId, messages, abortController }) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({
      threadId: threadId || crypto.randomUUID(),
      messages
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    signal: abortController.signal,
  });
  return response;
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <CrayonChat
        processMessage={processMessage}
        placeholder="Ask me about the weather... (e.g., 'What's the weather in Tokyo?')"
      />
    </div>
  );
}