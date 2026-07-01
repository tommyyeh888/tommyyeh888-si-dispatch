'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

export default function OptionsPage() {
  const [options, setOptions] = useState<{id: string; label: string; sort_order: number}[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/service-options');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setOptions(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/service-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setNewLabel('');
      fetchOptions();
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除這個選項？')) return;
    await fetch(`/api/service-options?id=${id}`, { method: 'DELETE' });
    fetchOptions();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin" className="text-sm text-slate-500 underline">← 返回</a>
          <h1 className="text-xl font-semibold text-slate-900">維修保養選項</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="輸入選項名稱（例如：更換碳粉匣）"
              className="input flex-1"
            />
            <button onClick={add} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              新增
            </button>
          </div>

          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-slate-400">載入中...</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-slate-400">尚無選項，請新增</p>
          ) : (
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-800">{i + 1}. {o.label}</span>
                  <button onClick={() => remove(o.id)} className="text-xs text-red-500">刪除</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <style jsx global>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background: white; }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}
