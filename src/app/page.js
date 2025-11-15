'use client';
import { CrayonChat } from "@crayonai/react-ui";
import "@crayonai/react-ui/styles/index.css";
import { WeatherCard } from "./components/WeatherCard";

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

// Custom renderer for weather data
const customRenderers = {
  WeatherCard: WeatherCard,
};

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <CrayonChat
        processMessage={processMessage}
        customRenderers={customRenderers}
        placeholder="Ask me about the weather... (e.g., 'What's the weather in Tokyo?')"
      />
    </div>
  );
}
