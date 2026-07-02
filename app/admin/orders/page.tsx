'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

interface Order {
  id: string;
  customer_name: string;
  branch: string;
  date: string;
  status: 'pending' | 'completed';
  pdf_drive_url: string;
  short_code: string;
  created_at: string;
}

interface Customer { id: string; name: string; }

export default function OrdersPage() {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers').then(r => r.json()).then(data => setCustomers(Array.isArray(data) ? data : []));
  }, []);

  const fetchOrders = () => {
    setLoading(true);
    const params = new URLSearchParams({ month });
    if (customerId) params.set('customer_id', customerId);
    fetch(`/api/orders?${params}`)
      .then(r => r.json())
      .then(data => { setOrders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [month, customerId]);

  const deleteOrder = async (id: string) => {
    if (!confirm('確定刪除此派工紀錄？此動作無法復原。')) return;
    await fetch(`/api/orders?id=${id}`, { method: 'DELETE' });
    fetchOrders();
  };

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    return { val, label };
  });

  const pending = orders.filter(o => o.status === 'pending').length;
  const completed = orders.filter(o => o.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin" className="text-sm text-slate-500 underline">← 主選單</a>
          <h1 className="text-xl font-semibold text-slate-900">查詢派工單</h1>
        </div>

        <div className="mb-4 flex gap-2">
          <select value={month} onChange={e => setMonth(e.target.value)} className="input flex-1">
            {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="input flex-1">
            <option value="">全部客戶</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {!loading && (
          <div className="mb-4 flex gap-3">
            <div className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{orders.length}</p>
              <p className="text-xs text-slate-500">總派工數</p>
            </div>
            <div className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{pending}</p>
              <p className="text-xs text-amber-600">已派工</p>
            </div>
            <div className="flex-1 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-2xl font-bold text-green-600">{completed}</p>
              <p className="text-xs text-green-600">已回傳</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">載入中...</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">本月尚無派工紀錄</p>
        ) : (
          <div className="space-y-2">
            {orders.map(order => (
              <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{order.customer_name}</p>
                    <p className="text-sm text-slate-500">{order.branch || '—'}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-slate-400">{order.date || order.created_at?.slice(0, 10)}</p>
                      {order.short_code && (
                        <span className="text-xs text-slate-300">#{order.short_code}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {order.status === 'completed' ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">✅ 已回傳</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">🟡 已派工</span>
                    )}
                    {order.status === 'completed' && order.pdf_drive_url && (
                      <a href={order.pdf_drive_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline">查看 PDF ↗</a>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="text-xs text-red-400 underline"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .input { border: 1px solid rgb(203 213 225); border-radius: 0.5rem; padding: 0.5rem 0.75rem; font-size: 0.875rem; background: white; }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}
