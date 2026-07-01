'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SignatureBox from '@/components/SignatureBox';
import {
  decodeSeed,
  emptyMachines,
  emptyParts,
  type DispatchFormData,
  type DispatchSeed,
} from '@/lib/dispatch';

type Status = 'loading' | 'invalid' | 'ready' | 'submitting' | 'done' | 'error';

export default function DispatchFormPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<Status>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [seed, setSeed] = useState<DispatchSeed | null>(null);
  const [form, setForm] = useState<Partial<DispatchFormData>>({});
  const [serviceOptions, setServiceOptions] = useState<{id: string; label: string}[]>([]);

  useEffect(() => {
    const decoded = decodeSeed(token);
    if (!decoded) { setStatus('invalid'); return; }
    setSeed(decoded);
    setForm({
      ...decoded,
      date: new Date().toISOString().slice(0, 10),
      departTime: '', arriveTime: '', securityArriveTime: '', finishTime: '',
      machines: emptyMachines(6),
      selectedOptions: [],
      content: '',
      quoteFax: '', contactPerson: '', contactTitle: '',
      parts: emptyParts(6),
      engineerSignature: '', customerSignature: '',
    });

    // 讀取維修選項
    fetch('/api/service-options')
      .then(r => r.json())
      .then(data => { setServiceOptions(Array.isArray(data) ? data : []); setStatus('ready'); })
      .catch(() => setStatus('ready'));
  }, [token]);

  const update = (patch: Partial<DispatchFormData>) => setForm(f => ({ ...f, ...patch }));

  const toggleOption = (label: string) => {
    setForm(f => {
      const current = f.selectedOptions || [];
      const next = current.includes(label) ? current.filter(o => o !== label) : [...current, label];
      return { ...f, selectedOptions: next };
    });
  };

  const updateMachine = (i: number, no: string) => {
    setForm(f => {
      const machines = [...(f.machines || [])];
      machines[i] = { no };
      return { ...f, machines };
    });
  };

  const submit = async () => {
    if (!form.engineerSignature || !form.customerSignature) {
      alert('請完成工程師簽名與客戶簽名');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || '送出失敗'); setStatus('error'); return; }
      setStatus('done');
    } catch {
      setErrorMsg('網路連線失敗，請檢查網路後重試');
      setStatus('error');
    }
  };

  if (status === 'loading') return <Centered>載入中...</Centered>;
  if (status === 'invalid') return <Centered>連結無效或已損毀，請聯繫後台重新產生連結。</Centered>;
  if (status === 'done') return (
    <Centered>
      <div className="text-center">
        <p className="mb-2 text-2xl">✅</p>
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
          {seed?.customerName}{seed?.branchName ? ` / ${seed.branchName}` : ''}
        </p>
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-4">
        {/* 基本資訊 */}
        <Section title="基本資訊">
          <ReadonlyRow label="客戶名稱" value={seed?.customerName || ''} />
          <ReadonlyRow label="分店" value={seed?.branchName || ''} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">日期</span>
            <input
              type="date"
              value={form.date || ''}
              onChange={(e) => update({ date: e.target.value })}
              className="w-40 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
        </Section>

        {/* 機器序號 */}
        <Section title="機器序號">
          {(form.machines || []).map((m, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-sm text-slate-400">{i + 1}</span>
              <input
                value={m.no}
                onChange={(e) => updateMachine(i, e.target.value)}
                placeholder={`序號 ${i + 1}`}
                className="input"
              />
            </div>
          ))}
        </Section>

        {/* 維修/保養內容 */}
        <Section title="維修/保養內容">
          {serviceOptions.length > 0 ? (
            <div className="mb-3 space-y-2">
              {serviceOptions.map((opt) => {
                const checked = (form.selectedOptions || []).includes(opt.label);
                return (
                  <label key={opt.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${checked ? 'border-slate-800 bg-slate-50' : 'border-slate-200'}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleOption(opt.label)}
                      className="h-4 w-4 rounded accent-slate-800"
                    />
                    <span className="text-sm text-slate-800">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-sm text-slate-400">（後台尚未設定維修選項）</p>
          )}
          <textarea
            value={form.content || ''}
            onChange={(e) => update({ content: e.target.value })}
            rows={3}
            className="input resize-none"
            placeholder="補充說明（選填）"
          />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <input value={form.quoteFax || ''} onChange={(e) => update({ quoteFax: e.target.value })} placeholder="報價收費傳真" className="input" />
            <div className="flex gap-2">
              <input value={form.contactPerson || ''} onChange={(e) => update({ contactPerson: e.target.value })} placeholder="聯絡人" className="input" />
              <select value={form.contactTitle || ''} onChange={(e) => update({ contactTitle: e.target.value as '先生' | '小姐' | '' })} className="input w-20">
                <option value="">稱謂</option>
                <option value="先生">先生</option>
                <option value="小姐">小姐</option>
              </select>
            </div>
          </div>
        </Section>

        {/* 簽名 */}
        <Section title="簽名">
          <div className="space-y-4">
            <SignatureBox label="工程師簽名" onChange={(url) => update({ engineerSignature: url })} />
            <SignatureBox label="客戶簽名" onChange={(url) => update({ customerSignature: url })} />
          </div>
        </Section>

        {status === 'error' && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errorMsg}</p>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3">
        <button
          onClick={submit}
          disabled={status === 'submitting'}
          className="mx-auto block w-full max-w-md rounded-lg bg-slate-900 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === 'submitting' ? '上傳中...' : '完成並送出'}
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
