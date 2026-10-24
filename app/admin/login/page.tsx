'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [mode, setMode] = useState<'staff' | 'legacy'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload =
        mode === 'staff'
          ? { email: email.trim(), password }
          : { password };
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登入失敗');
        return;
      }
      router.push('/admin');
      router.refresh();
    } catch {
      setError('連線失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-1 text-lg font-semibold text-slate-900">
          聚英資訊 派工系統
        </h1>
        <p className="mb-5 text-sm text-slate-500">後台管理登入 (與 SI-CRM 帳號互通)</p>

        <div className="mb-5 flex rounded-lg border border-slate-200 bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => { setMode('staff'); setError(''); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === 'staff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            員工帳號登入
          </button>
          <button
            type="button"
            onClick={() => { setMode('legacy'); setError(''); }}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === 'legacy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
            }`}
          >
            舊版管理密碼
          </button>
        </div>

        {mode === 'staff' && (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              員工 Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@portechsys.com"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              autoFocus
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            密碼
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            autoFocus={mode === 'legacy'}
          />
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? '登入中...' : '登入'}
        </button>
      </form>
    </div>
  );
}
