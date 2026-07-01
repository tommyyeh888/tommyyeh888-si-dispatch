'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { createSeed, encodeSeed } from '@/lib/dispatch';

interface Customer { id: string; name: string; }

export default function AdminPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [branch, setBranch] = useState('');
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const generate = () => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) { alert('請選擇客戶'); return; }
    const seed = createSeed({ customerName: customer.name, branchName: branch, customerId: customer.id });
    const token = encodeSeed(seed);
    setLink(`${window.location.origin}/dispatch/${token}`);
    setCopied(false);
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">聚英資訊 派工系統</h1>
            <p className="text-sm text-slate-500">後台管理</p>
          </div>
          <div className="flex gap-2">
            <a href="/admin/customers" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">客戶管理</a>
            <a href="/admin/options" className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">維修選項</a>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-medium text-slate-900">建立派工單</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">客戶 *</label>
            {loading ? (
              <p className="text-sm text-slate-400">載入中...</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-red-500">尚無客戶，請先到「<a href="/admin/customers" className="underline">客戶管理</a>」新增</p>
            ) : (
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input">
                <option value="">請選擇客戶</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">分店</label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="input" placeholder="例如：龍潭廠" />
          </div>
          <button onClick={generate} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white">
            產生派工連結
          </button>
        </div>

        {link && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-700">派工連結（傳給工程師）</p>
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="input flex-1 text-xs" onFocus={(e) => e.target.select()} />
              <button onClick={copy} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700">
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background: white; }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}
