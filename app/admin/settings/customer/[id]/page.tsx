'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Customer { id: string; name: string; }
interface ServiceOption { id: string; label: string; sort_order: number; }

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allOptions, setAllOptions] = useState<ServiceOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/customers').then(r => r.json()),
      fetch('/api/service-options').then(r => r.json()),
      fetch(`/api/customer-options?customer_id=${customerId}`).then(r => r.json()),
    ]).then(([customers, options, selectedOptionIds]) => {
      const found = (Array.isArray(customers) ? customers : []).find((c: Customer) => c.id === customerId);
      if (found) { setCustomer(found); setCustomerName(found.name); }
      setAllOptions(Array.isArray(options) ? options : []);
      setSelectedIds(Array.isArray(selectedOptionIds) ? selectedOptionIds : []);
      setLoading(false);
    });
  }, [customerId]);

  const toggleOption = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setSaving(true);
    await fetch('/api/customer-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_id: customerId, option_ids: selectedIds }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-400">載入中...</div>;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-sm text-slate-500 underline">← 返回</button>
          <h1 className="text-xl font-semibold text-slate-900">{customer?.name}</h1>
        </div>

        {/* 維修保養選項 */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium text-slate-900">維修保養選項</h2>
            <span className="text-xs text-slate-400">已選 {selectedIds.length} 項</span>
          </div>

          {allOptions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">尚無全域選項</p>
              <a href="/admin/settings" className="mt-2 block text-xs text-blue-600 underline">
                到系統設定新增維修選項
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {allOptions.map(opt => {
                const checked = selectedIds.includes(opt.id);
                return (
                  <label key={opt.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.id)}
                      className="h-4 w-4 rounded accent-slate-800"
                    />
                    <span className="text-sm text-slate-800">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? '儲存中...' : saved ? '✓ 已儲存' : '儲存設定'}
          </button>
        </div>
      </div>
    </div>
  );
}
