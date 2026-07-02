'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureBox from '@/components/SignatureBox';
import { emptyMachines, emptyParts } from '@/lib/dispatch';

type Status = 'loading' | 'invalid' | 'done_already' | 'ready' | 'submitting' | 'done' | 'error';

interface OrderData {
  id: string;
  customer_name: string;
  branch: string;
  customer_id: string;
  token: string;
  short_code: string;
}

interface ServiceOption { id: string; label: string; }

export default function ShortLinkPage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();

  const [status, setStatus] = useState<Status>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // 日期自動帶入當天
  const [date] = useState(new Date().toISOString().slice(0, 10));
  const [machines, setMachines] = useState(emptyMachines(6));
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactTitle, setContactTitle] = useState('');
  const [engineerSig, setEngineerSig] = useState('');
  const [customerSig, setCustomerSig] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/d?code=${code}`).then(r => r.json()),
      fetch('/api/service-options').then(r => r.json()),
    ]).then(([orderData, allOpts]) => {
      if (orderData.error) {
        if (orderData.error.includes('已完成')) setStatus('done_already');
        else setStatus('invalid');
        return;
      }
      setOrder(orderData);

      // 讀取該客戶的專屬選項
      const customerId = orderData.customer_id;
      if (customerId) {
        fetch(`/api/customer-options?customer_id=${customerId}`)
          .then(r => r.json())
          .then(selectedIds => {
            if (Array.isArray(selectedIds) && selectedIds.length > 0) {
              // 有設定專屬選項，只顯示已勾選的
              const filtered = (Array.isArray(allOpts) ? allOpts : [])
                .filter((o: { id: string; label: string }) => selectedIds.includes(o.id));
              setServiceOptions(filtered);
            } else {
              // 沒設定，顯示全部
              setServiceOptions(Array.isArray(allOpts) ? allOpts : []);
            }
            setStatus('ready');
          });
      } else {
        setServiceOptions(Array.isArray(allOpts) ? allOpts : []);
        setStatus('ready');
      }
    }).catch(() => setStatus('invalid'));
  }, [code]);

  const toggleOption = (label: string) => {
    setSelectedOptions(prev =>
      prev.includes(label) ? prev.filter(o => o !== label) : [...prev, label]
    );
  };

  const updateMachine = (i: number, no: string) => {
    setMachines(prev => { const m = [...prev]; m[i] = { no }; return m; });
  };

  const submit = async () => {
    if (!engineerSig || !customerSig) {
      alert('請完成工程師簽名與客戶簽名');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: order!.customer_name,
          branchName: order!.branch,
          customerId: order!.customer_id,
          machineCount: 6, partCount: 6,
          createdAt: new Date().toISOString(),
          token: order!.token || order!.id,
          date, machines, selectedOptions, content,
          quoteFax: '', contactPerson, contactTitle,
          parts: emptyParts(6),
          engineerSignature: engineerSig,
          customerSignature: customerSig,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || '送出失敗'); setStatus('error'); return; }
      setStatus('done');
    } catch {
      setErrorMsg('網路連線失敗，請重試');
      setStatus('error');
    }
  };

  if (status === 'loading') return <Centered>載入中...</Centered>;
  if (status === 'invalid') return <Centered>連結無效，請聯繫後台重新產生。</Centered>;
  if (status === 'done_already') return <Centered>此派工單已完成回傳，無需重複送出。</Centered>;
  if (status === 'done') return (
    <Centered>
      <div className="text-center">
        <p className="mb-2 text-4xl">✅</p>
        <p className="mb-2 text-lg font-medium text-slate-900">已上傳成功</p>
        <p className="text-sm text-slate-500">派工單已送出，可關閉此頁</p>
        <p className="mt-1 text-sm text-slate-500">謝謝您！</p>
      </div>
    </Centered>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-base font-semibold text-slate-900">聚英資訊 保養維修單</h1>
        <p className="text-sm text-slate-500">
          {order?.customer_name}{order?.branch ? ` / ${order.branch}` : ''}
          <span className="ml-2 text-xs text-slate-400">#{code}</span>
        </p>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4">
        <Section title="基本資訊">
          <ReadonlyRow label="客戶名稱" value={order?.customer_name || ''} />
          <ReadonlyRow label="分店" value={order?.branch || ''} />
          <ReadonlyRow label="日期" value={date} />
        </Section>

        <Section title="機器序號">
          {machines.map((m, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm text-slate-400">{i + 1}</span>
              <input value={m.no} onChange={e => updateMachine(i, e.target.value)}
                placeholder={`序號 ${i + 1}`} className="input" />
            </div>
          ))}
        </Section>

        <Section title="維修/保養內容">
          {serviceOptions.length > 0 && (
            <div className="mb-3 space-y-2">
              {serviceOptions.map(opt => {
                const checked = selectedOptions.includes(opt.label);
                return (
                  <label key={opt.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleOption(opt.label)}
                      className="h-4 w-4 rounded accent-slate-800" />
                    <span className="text-sm text-slate-800">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          )}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            rows={3} className="input resize-none" placeholder="補充說明（選填）" />
          <div className="mt-3">
            <input value={contactPerson} onChange={e => setContactPerson(e.target.value)}
              placeholder="聯絡人" className="input" />
          </div>
        </Section>

        <Section title="簽名">
          <div className="space-y-4">
            <SignatureBox label="工程師簽名" onChange={setEngineerSig} />
            <SignatureBox label="客戶簽名" onChange={setCustomerSig} />
          </div>
        </Section>

        {status === 'error' && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3">
        {status === 'submitting' && (
          <p className="mb-2 text-center text-sm text-slate-500">上傳中，請稍候...</p>
        )}
        <button onClick={submit} disabled={status === 'submitting'}
          className="mx-auto block w-full max-w-md rounded-lg bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-50">
          {status === 'submitting' ? '⏳ 上傳中...' : '完成並送出'}
        </button>
      </div>

      <style jsx global>{`
        .input { width: 100%; border: 1px solid rgb(203 213 225); border-radius: 0.5rem; padding: 0.625rem 0.75rem; font-size: 0.875rem; background: white; }
        .input:focus { outline: none; border-color: rgb(100 116 139); }
      `}</style>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center text-slate-600">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex justify-between text-sm last:mb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}
