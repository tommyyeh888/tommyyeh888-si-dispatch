'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Customer {
  id: string;
  name: string;
  crm_customer_id?: string | null;
}

interface CustomerGroup {
  id: string;
  customer_id: string;
  name: string;
  code: string | null;
}

interface CustomerBranch {
  id: string;
  customer_id: string;
  group_id: string | null;
  name: string;
  code: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  contact_person: string | null;
  status: string | null;
}

export default function CreatePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [branches, setBranches] = useState<CustomerBranch[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [useCustomBranch, setUseCustomBranch] = useState(false);
  const [customBranchName, setCustomBranchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/customers')
      .then((r) => r.json())
      .then((data) => {
        setCustomers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // 當選擇客戶變更時，自動載入該客戶在 si-crm 的品牌群組 (customer_groups) 與門市清單 (customer_branches)
  useEffect(() => {
    setSelectedGroupId('');
    setSelectedBranchId('');
    setCustomBranchName('');
    setGroups([]);
    setBranches([]);

    if (!customerId) return;
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return;

    setLoadingBranches(true);
    const params = new URLSearchParams({
      customer_id: customer.id,
      customer_name: customer.name,
    });
    if (customer.crm_customer_id) {
      params.set('crm_customer_id', customer.crm_customer_id);
    }

    fetch(`/api/branches?${params}`)
      .then((r) => r.json())
      .then((data) => {
        const fetchedGroups: CustomerGroup[] = Array.isArray(data?.groups) ? data.groups : [];
        const fetchedBranches: CustomerBranch[] = Array.isArray(data?.branches) ? data.branches : [];
        setGroups(fetchedGroups);
        setBranches(fetchedBranches);
        setUseCustomBranch(fetchedBranches.length === 0);
        setLoadingBranches(false);
      })
      .catch(() => {
        setUseCustomBranch(true);
        setLoadingBranches(false);
      });
  }, [customerId, customers]);

  const filteredBranches = selectedGroupId
    ? branches.filter((b) => b.group_id === selectedGroupId)
    : branches;

  const selectedBranchObj = branches.find((b) => b.id === selectedBranchId) || null;

  const generate = async () => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      alert('請選擇客戶');
      return;
    }

    const finalBranchName = useCustomBranch
      ? customBranchName.trim()
      : selectedBranchObj?.name || '';

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          crm_customer_id: customer.crm_customer_id || null,
          customer_name: customer.name,
          group_id: selectedGroupId || null,
          branch_id: useCustomBranch ? null : selectedBranchObj?.id || null,
          branch: finalBranchName,
          branch_address: useCustomBranch ? null : selectedBranchObj?.address || null,
          branch_phone: useCustomBranch ? null : selectedBranchObj?.phone || null,
          branch_contact_person: useCustomBranch ? null : selectedBranchObj?.contact_person || null,
        }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.error || '建立失敗');

      const shortUrl = `${window.location.origin}/d/${order.short_code}`;

      await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: order.id }),
      });

      router.push(
        `/admin/create/result?url=${encodeURIComponent(shortUrl)}&customer=${encodeURIComponent(customer.name)}&branch=${encodeURIComponent(finalBranchName)}&code=${order.short_code}`
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
              <p className="text-sm text-red-500">
                尚無客戶，請先到「<a href="/admin/settings" className="underline">系統設定</a>」新增
              </p>
            ) : (
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="input"
              >
                <option value="">請選擇客戶</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 若該客戶在 si-crm 有設定多個品牌群組（例如：雙月食品、老井集團旗下品牌），顯示品牌篩選 */}
          {customerId && groups.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                品牌群組 (SI-CRM)
              </label>
              <select
                value={selectedGroupId}
                onChange={(e) => {
                  setSelectedGroupId(e.target.value);
                  setSelectedBranchId('');
                }}
                className="input"
              >
                <option value="">全部品牌 ({branches.length} 間門市)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">分店 / 門市</label>
              {customerId && branches.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setUseCustomBranch((prev) => !prev);
                    setSelectedBranchId('');
                  }}
                  className="text-xs text-blue-600 underline"
                >
                  {useCustomBranch ? '改從 SI-CRM 門市選單挑選' : '+ 手動輸入新分店'}
                </button>
              )}
            </div>

            {loadingBranches ? (
              <p className="text-sm text-slate-400">載入 SI-CRM 門市清單中...</p>
            ) : !useCustomBranch && branches.length > 0 ? (
              <>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="input"
                >
                  <option value="">請選擇門市（共 {filteredBranches.length} 間）</option>
                  {filteredBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.city ? ` (${b.city})` : ''}
                    </option>
                  ))}
                </select>

                {selectedBranchObj && (
                  <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                    {selectedBranchObj.address && (
                      <p>📍 地址：{selectedBranchObj.address}</p>
                    )}
                    {selectedBranchObj.phone && (
                      <p>📞 電話：{selectedBranchObj.phone}</p>
                    )}
                    {selectedBranchObj.contact_person && (
                      <p>👤 聯絡人：{selectedBranchObj.contact_person}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <input
                value={customBranchName}
                onChange={(e) => setCustomBranchName(e.target.value)}
                className="input"
                placeholder="例如：龍潭廠、森林公園店（新分店將自動同步至 SI-CRM）"
              />
            )}
          </div>

          <button
            onClick={generate}
            disabled={submitting || loading}
            className="w-full rounded-lg bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
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
