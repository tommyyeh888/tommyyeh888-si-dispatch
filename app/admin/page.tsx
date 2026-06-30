'use client';

import { useState } from 'react';

export default function AdminPage() {
  const [customerName, setCustomerName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [machineCount, setMachineCount] = useState(2);
  const [partCount, setPartCount] = useState(2);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (!customerName) {
      alert('請輸入客戶名稱');
      return;
    }
    const res = await fetch('/api/create-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName,
        branchName,
        projectId,
        machineCount,
        partCount,
      }),
    });
    const data = await res.json();
    setLink(data.url);
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
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          建立派工單
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          填寫客戶資訊後產生連結，傳給現場工程師即可
        </p>

        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <Field label="客戶名稱 *">
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="input"
              placeholder="例如：中國上優"
            />
          </Field>
          <Field label="分店">
            <input
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="input"
              placeholder="例如：MAZDA新竹苗栗廠"
            />
          </Field>
          <Field label="Project ID">
            <input
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="input"
            />
          </Field>
          <div className="flex gap-4">
            <Field label="機器序號筆數">
              <input
                type="number"
                min={1}
                max={10}
                value={machineCount}
                onChange={(e) => setMachineCount(Number(e.target.value))}
                className="input"
              />
            </Field>
            <Field label="零件筆數">
              <input
                type="number"
                min={1}
                max={10}
                value={partCount}
                onChange={(e) => setPartCount(Number(e.target.value))}
                className="input"
              />
            </Field>
          </div>

          <button
            onClick={generate}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white"
          >
            產生派工連結
          </button>
        </div>

        {link && (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-700">
              派工連結（傳給工程師）
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link}
                className="input flex-1 text-xs"
                onFocus={(e) => e.target.select()}
              />
              <button
                onClick={copy}
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
              >
                {copied ? '已複製' : '複製'}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(203 213 225);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }
        .input:focus {
          outline: none;
          border-color: rgb(100 116 139);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}
