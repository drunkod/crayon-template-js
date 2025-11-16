'use client';
import { CrayonChat } from "@crayonai/react-ui";
import "@crayonai/react-ui/styles/index.css";
import { WeatherCard } from './components/WeatherCard';
import { TextTemplate } from './components/TextTemplate';

const processMessage = async ({ threadId, messages, abortController }) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    body: JSON.stringify({ threadId, messages }),
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
    <CrayonChat
      processMessage={processMessage}
      responseTemplates={[
        {
          name: "weather",
          Component: WeatherCard,
        },
        {
          name: "text",
          Component: TextTemplate,
        },
      ]}
    />
  );
}