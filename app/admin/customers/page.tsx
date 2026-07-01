'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase, type Customer } from '@/lib/supabase';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    const { data } = await supabase
      .from('dispatch_customers')
      .select('*')
      .order('sort_order');
    setCustomers(data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!newName.trim()) return;
    const maxOrder = customers.length > 0 ? Math.max(...customers.map(c => c.sort_order)) : 0;
    await supabase.from('dispatch_customers').insert({ name: newName.trim(), sort_order: maxOrder + 1 });
    setNewName('');
    fetch();
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除這個客戶？')) return;
    await supabase.from('dispatch_customers').delete().eq('id', id);
    fetch();
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
            <button
              onClick={add}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              新增
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">載入中...</p>
          ) : customers.length === 0 ? (
            <p className="text-sm text-slate-400">尚無客戶，請新增</p>
          ) : (
            <ul className="space-y-2">
              {customers.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-800">{c.name}</span>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-xs text-red-500"
                  >
                    刪除
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <style jsx global>{`
        .input {
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          background: white;
        }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}
