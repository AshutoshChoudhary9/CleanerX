'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚠️</div>
      <h2 style={{ fontFamily: "'Baloo 2', sans-serif", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>{error.message || 'An unexpected error occurred.'}</p>
      <button onClick={reset} style={{ background: '#0a6ebd', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        Try Again
      </button>
    </div>
  );
}
