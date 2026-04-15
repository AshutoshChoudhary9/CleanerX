'use client';

import { FormEvent, useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/';

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      router.replace(redirectTarget);
    }
  }, [router, redirectTarget]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password || (mode === 'signup' && !form.name)) {
      setError('Please fill all required fields.');
      return;
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/login' : '/api/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed.');
        return;
      }

      localStorage.setItem('authToken', data.token);
      router.replace(redirectTarget);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        <p className="subtitle">Login to manage your cart and wishlist.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Full Name
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <span onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </span>
        </p>

        <Link href={redirectTarget} className="back-link">
          Back to previous page
        </Link>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .auth-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: linear-gradient(160deg, #f0f4ff 0%, #f7fff7 100%);
        }

        .auth-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.08);
        }

        .auth-card h1 {
          margin: 0;
          color: #0f172a;
          font-size: 28px;
        }

        .subtitle {
          margin: 8px 0 20px;
          color: #475569;
          font-size: 14px;
        }

        .auth-form {
          display: grid;
          gap: 14px;
        }

        .auth-form label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          color: #334155;
          font-weight: 600;
        }

        .auth-form input {
          border: 1px solid #d1d5db;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }

        .auth-form input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
        }

        .auth-form button {
          margin-top: 4px;
          border: 0;
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 14px;
          font-weight: 700;
          background: #2563eb;
          color: #fff;
          cursor: pointer;
        }

        .auth-form button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .error {
          color: #b91c1c;
          font-size: 13px;
          margin: 0;
        }

        .switch {
          margin-top: 16px;
          font-size: 13px;
          color: #475569;
        }

        .switch span {
          color: #1d4ed8;
          font-weight: 700;
          cursor: pointer;
        }

        .back-link {
          margin-top: 10px;
          display: inline-block;
          font-size: 13px;
          color: #64748b;
          text-decoration: none;
        }
      `}} />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="loading-screen">Loading authentication...</div>}>
      <LoginContent />
    </Suspense>
  );
}
