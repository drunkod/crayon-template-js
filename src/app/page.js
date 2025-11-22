'use client';
import dynamic from 'next/dynamic';
import { WeatherCard } from './components/WeatherCard';
import { DebugPanel } from './components/DebugPanel';
import { EnvStatus } from './components/EnvStatus';
import { processMessage } from '@/lib/messageProcessor';

const CrayonChat = dynamic(
  () => import('@crayonai/react-ui').then((mod) => mod.CrayonChat),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <EnvStatus />
      <CrayonChat
        processMessage={processMessage}
        responseTemplates={[
          {
            name: 'weather',
            Component: WeatherCard,
          },
        ]}
      />
      <DebugPanel />
    </>
  );
}
