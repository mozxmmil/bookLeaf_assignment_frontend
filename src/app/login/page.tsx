'use client';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { homeFor, useAuth } from '@/lib/auth';
import { ApiError } from '@/lib/api';
import { Spinner } from '@/components/ui';

const DEMO = [
  { label: 'Author — Priya Sharma', email: 'priya.sharma@example.com', password: 'author123' },
  { label: 'Author — Michael Carter (book in production)', email: 'michael.carter@example.com', password: 'author123' },
  { label: 'Admin — Support Lead', email: 'admin@bookleaf.com', password: 'admin123' },
];

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const expired = useSearchParams().get('expired');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(expired ? 'Your session expired. Please sign in again.' : null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) router.replace(homeFor(user.role)); }, [user, loading, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const u = await login(email, password);
      router.replace(homeFor(u.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-leaf-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-3xl font-semibold text-leaf-700">🍃 BookLeaf</div>
          <p className="mt-1 text-sm text-slate-500">Author Support & Communication Portal</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 p-6" noValidate>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={submitting || !email || !password}>
            {submitting && <Spinner className="h-4 w-4 text-white" />} Sign in
          </button>
        </form>
        <div className="card mt-4 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Demo accounts</p>
          <div className="space-y-1">
            {DEMO.map((d) => (
              <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-50">
                <span className="text-slate-700">{d.label}</span><span className="text-xs text-slate-400">Use →</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-400">All authors in the sample dataset use password <code>author123</code>.</p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
