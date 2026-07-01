'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<{id: string; name: string; sort_order: number}[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '讀取失敗');
      setCustomers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  const add = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '新增失敗');
      setNewName('');
      fetchCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : '新增失敗');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除這個客戶？')) return;
    await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    fetchCustomers();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin" className="text-sm text-slate-500 underline">← 返回</a>
          <h1 className="text-xl font-semibold text-slate-900">客戶管理</h1>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="輸入客戶名稱"
              className="input flex-1"
            />
            <button onClick={add} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              新增
            </button>
          </div>

          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {loading ? (
            <p className="text-sm text-slate-400">載入中...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-slate-400">尚無客戶，請新增</p>
          ) : (
            <ul className="space-y-2">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-800">{c.name}</span>
                  <button onClick={() => remove(c.id)} className="text-xs text-red-500">刪除</button>
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
