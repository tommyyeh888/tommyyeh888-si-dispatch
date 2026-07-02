'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResultContent() {
  const params = useSearchParams();
  const url = params.get('url') || '';
  const customer = params.get('customer') || '';
  const branch = params.get('branch') || '';
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          <div className="mb-4 text-5xl">✅</div>
          <h1 className="mb-1 text-xl font-bold text-slate-900">派工單已建立</h1>
          <p className="mb-6 text-sm text-slate-500">
            {customer}{branch ? ` / ${branch}` : ''}<br />
            狀態已記錄為「已派工」，等待工程師回傳
          </p>

          <div className="mb-6 rounded-lg bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500 text-left">派工連結（傳給工程師）</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                onFocus={e => e.target.select()}
              />
              <button
                onClick={copy}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white"
              >
                {copied ? '已複製 ✓' : '複製'}
              </button>
            </div>
          </div>

          <a
            href="/admin"
            className="block w-full rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-700 text-center"
          >
            回到主選單
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-slate-500">載入中...</div>}>
      <ResultContent />
    </Suspense>
  );
}
