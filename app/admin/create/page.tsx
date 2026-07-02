'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer { id: string; name: string; }

export default function CreatePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/customers')
      .then(r => r.json())
      .then(data => { setCustomers(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const generate = async () => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) { alert('請選擇客戶'); return; }
    setSubmitting(true);
    try {
      // 建立 Supabase 紀錄，自動產生短碼
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          customer_name: customer.name,
          branch,
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || '建立失敗');

      // 短連結格式：/d/短碼
      const shortUrl = `${window.location.origin}/d/${order.short_code}`;

      // 把短碼存回 token 欄位（方便 submit API 對應）
      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: order.id }),
      });

      router.push(
        `/admin/create/result?url=${encodeURIComponent(shortUrl)}&customer=${encodeURIComponent(customer.name)}&branch=${encodeURIComponent(branch)}&code=${order.short_code}`
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : '發生錯誤');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin" className="text-sm text-slate-500 underline">← 主選單</a>
          <h1 className="text-xl font-semibold text-slate-900">新增派工單</h1>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">客戶 *</label>
            {loading ? (
              <p className="text-sm text-slate-400">載入中...</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-red-500">尚無客戶，請先到「<a href="/admin/settings" className="underline">系統設定</a>」新增</p>
            ) : (
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input">
                <option value="">請選擇客戶</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">分店</label>
            <input value={branch} onChange={e => setBranch(e.target.value)}
              className="input" placeholder="例如：龍潭廠" />
          </div>

          <button onClick={generate} disabled={submitting || loading}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-50">
            {submitting ? '建立中...' : '產生派工連結'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background: white; }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}
