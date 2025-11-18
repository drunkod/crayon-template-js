'use client';

export function EnvStatus() {
  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return null;
  }

  const useMockWeather = process.env.NEXT_PUBLIC_USE_MOCK_WEATHER === 'true';
  const useMockOpenRouter = process.env.NEXT_PUBLIC_USE_MOCK_OPENROUTER === 'true';

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
        AI: <span style={{ color: useMockOpenRouter ? '#fbbf24' : '#10b981' }}>
          {useMockOpenRouter ? '🎭 MOCK' : '🌐 REAL'}
        </span>
      </div>
    </div>
  );
}