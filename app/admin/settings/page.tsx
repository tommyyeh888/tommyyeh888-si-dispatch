'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'customers' | 'options'>('customers');
  const [customers, setCustomers] = useState<{id: string; name: string}[]>([]);
  const [options, setOptions] = useState<{id: string; label: string}[]>([]);
  const [newCustomer, setNewCustomer] = useState('');
  const [newOption, setNewOption] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [c, o] = await Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/service-options').then(r => r.json()),
    ]);
    setCustomers(Array.isArray(c) ? c : []);
    setOptions(Array.isArray(o) ? o : []);
  };

  const addCustomer = async () => {
    if (!newCustomer.trim()) return;
    setError('');
    const res = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCustomer.trim() }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNewCustomer(''); fetchAll();
  };

  const removeCustomer = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    await fetch(`/api/customers?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  const addOption = async () => {
    if (!newOption.trim()) return;
    setError('');
    const res = await fetch('/api/service-options', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: newOption.trim() }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setNewOption(''); fetchAll();
  };

  const removeOption = async (id: string) => {
    if (!confirm('確定刪除？')) return;
    await fetch(`/api/service-options?id=${id}`, { method: 'DELETE' });
    fetchAll();
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin" className="text-sm text-slate-500 underline">← 主選單</a>
          <h1 className="text-xl font-semibold text-slate-900">系統設定</h1>
        </div>

        {/* Tab */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button onClick={() => setTab('customers')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'customers' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              客戶管理
            </button>
            <button onClick={() => setTab('options')} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${tab === 'options' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              維修保養選項
            </button>
          </div>
          <a href="/admin/logs" className="text-xs text-slate-500 underline ml-2">登入紀錄</a>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {tab === 'customers' ? (
            <>
              <div className="mb-4 flex gap-2">
                <input value={newCustomer} onChange={e => setNewCustomer(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomer()} placeholder="輸入客戶名稱" className="input flex-1" />
                <button onClick={addCustomer} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">新增</button>
              </div>
              {customers.length === 0 ? <p className="text-sm text-slate-400">尚無客戶</p> : (
                <ul className="space-y-2">
                  {customers.map(c => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <span className="text-sm text-slate-800">{c.name}</span>
                      <div className="flex items-center gap-3">
                        <a href={`/admin/settings/customer/${c.id}`} className="text-xs text-blue-600 underline">設定選項</a>
                        <button onClick={() => removeCustomer(c.id)} className="text-xs text-red-500">刪除</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <div className="mb-4 flex gap-2">
                <input value={newOption} onChange={e => setNewOption(e.target.value)} onKeyDown={e => e.key === 'Enter' && addOption()} placeholder="輸入選項名稱" className="input flex-1" />
                <button onClick={addOption} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">新增</button>
              </div>
              {options.length === 0 ? <p className="text-sm text-slate-400">尚無選項</p> : (
                <ul className="space-y-2">
                  {options.map((o, i) => (
                    <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                      <span className="text-sm text-slate-800">{i + 1}. {o.label}</span>
                      <button onClick={() => removeOption(o.id)} className="text-xs text-red-500">刪除</button>
                    </li>
                  ))}
                </ul>
              )}
            </>
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
