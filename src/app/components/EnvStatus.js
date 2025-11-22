'use client';
import { isDebugMode, isMockWeather, isMockAI, getAIProvider } from '@/lib/utils/config';

export function EnvStatus() {
  if (!isDebugMode()) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#1a1a1a',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 9997,
        display: 'flex',
        gap: '12px',
      }}
    >
      <div>
        Weather:{' '}
        <span style={{ color: isMockWeather() ? '#fbbf24' : '#10b981' }}>
          {isMockWeather() ? '🎭 MOCK' : '🌐 REAL'}
        </span>
      </div>
      <div>
        AI:{' '}
        <span style={{ color: isMockAI() ? '#fbbf24' : '#10b981' }}>
          {isMockAI() ? '🎭 MOCK' : `🌐 ${getAIProvider().toUpperCase()}`}
        </span>
      </div>
    </div>
  );
}
