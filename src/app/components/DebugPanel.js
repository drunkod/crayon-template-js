'use client';
import { useState, useEffect } from 'react';
import { debugLogger } from '@/lib/debug';

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLogs([...debugLogger.getLogs()]);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') {
    return null;
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          background: '#1a1a1a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        🐛 Debug ({logs.length})
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            width: '600px',
            maxHeight: '500px',
            background: '#1a1a1a',
            color: '#fff',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 9998,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
              Debug Console
            </h3>
            <div>
              <button
                onClick={() => {
                  debugLogger.clear();
                  setLogs([]);
                }}
                style={{
                  padding: '4px 12px',
                  background: '#333',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  marginRight: '8px',
                }}
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  padding: '4px 12px',
                  background: '#333',
                  border: 'none',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Logs */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                No logs yet
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #2a2a2a',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: '#888', fontSize: '10px' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      style={{
                        color: getCategoryColor(log.category),
                        fontWeight: 'bold',
                      }}
                    >
                      [{log.category}]
                    </span>
                  </div>
                  <div style={{ color: '#ddd' }}>{log.message}</div>
                  {log.data && (
                    <pre
                      style={{
                        marginTop: '4px',
                        padding: '8px',
                        background: '#0a0a0a',
                        borderRadius: '4px',
                        fontSize: '10px',
                        overflow: 'auto',
                        maxHeight: '100px',
                      }}
                    >
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getCategoryColor(category) {
  const colors = {
    API: '#3b82f6',
    AI: '#8b5cf6',
    WEATHER: '#10b981',
    STREAM: '#f59e0b',
  };
  return colors[category] || '#6b7280';
}