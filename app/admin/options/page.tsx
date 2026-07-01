'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase, type ServiceOption } from '@/lib/supabase';

export default function OptionsPage() {
  const [options, setOptions] = useState<ServiceOption[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchOptions(); }, []);

  const fetchOptions = async () => {
    const { data } = await supabase
      .from('dispatch_service_options')
      .select('*')
      .order('sort_order');
    setOptions(data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!newLabel.trim()) return;
    const maxOrder = options.length > 0 ? Math.max(...options.map(o => o.sort_order)) : 0;
    await supabase.from('dispatch_service_options').insert({ label: newLabel.trim(), sort_order: maxOrder + 1 });
    setNewLabel('');
    fetchOptions();
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除這個選項？')) return;
    await supabase.from('dispatch_service_options').delete().eq('id', id);
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
            <button
              onClick={add}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              新增
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-slate-400">載入中...</p>
          ) : options.length === 0 ? (
            <p className="text-sm text-slate-400">尚無選項，請新增</p>
          ) : (
            <ul className="space-y-2">
              {options.map((o, i) => (
                <li key={o.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <span className="text-sm text-slate-800">{i + 1}. {o.label}</span>
                  <button
                    onClick={() => remove(o.id)}
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
