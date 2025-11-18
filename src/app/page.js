'use client';
import dynamic from 'next/dynamic';
import { WeatherCard } from './components/WeatherCard';
import { DebugPanel } from './components/DebugPanel';
import { apiDebug } from '@/lib/debug';
import { EnvStatus } from './components/EnvStatus';

// 🔧 Load CrayonChat only on the client; do not SSR it
const CrayonChat = dynamic(
  () => import('@crayonai/react-ui').then(mod => mod.CrayonChat),
  { ssr: false }
);

const processMessage = async ({ threadId, messages, abortController }) => {
  apiDebug.log('📤 Sending message to API', { 
    threadId, 
    messageCount: messages.length 
  });

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ threadId, messages }),
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      signal: abortController.signal,
    });
    
    apiDebug.success('📥 Response received', { 
      status: response.status,
      contentType: response.headers.get('content-type')
    });
    
    return response;
  } catch (error) {
    apiDebug.error('Request failed', error);
    throw error;
  }
};

export default function Home() {
  return (
    <>
      <EnvStatus />
      <CrayonChat
        processMessage={processMessage}
        responseTemplates={[
          {
            name: "weather",
            Component: WeatherCard,
          },
        ]}
      />
      <DebugPanel />
    </>
  );
}