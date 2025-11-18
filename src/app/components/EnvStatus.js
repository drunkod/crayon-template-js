'use client';

export function EnvStatus() {
  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return null;
  }

  const useMockWeather = process.env.NEXT_PUBLIC_USE_MOCK_WEATHER === 'true';
  const useMockAI = process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER === 'true';
  const aiProvider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'openrouter';

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
        Weather: <span style={{ color: useMockWeather ? '#fbbf24' : '#10b981' }}>
          {useMockWeather ? '🎭 MOCK' : '🌐 REAL'}
        </span>
      </div>
      <div>
        AI: <span style={{ color: useMockAI ? '#fbbf24' : '#10b981' }}>
          {useMockAI ? '🎭 MOCK' : `🌐 REAL (${aiProvider})`}
        </span>
      </div>
    </div>
  );
}
