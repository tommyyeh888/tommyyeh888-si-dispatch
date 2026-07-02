'use client';
export const dynamic = 'force-dynamic';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ResultContent() {
  const params = useSearchParams();
  const url = params.get('url') || '';
  const customer = params.get('customer') || '';
  const branch = params.get('branch') || '';
  const code = params.get('code') || '';
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
          <p className="mb-1 text-sm text-slate-600">{customer}{branch ? ` / ${branch}` : ''}</p>
          <p className="mb-6 text-xs text-slate-400">派工編號：{code}</p>

          <div className="mb-4 rounded-lg bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500 text-left">派工連結（傳給工程師）</p>
            <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left font-mono text-sm text-slate-800 break-all">
              {url}
            </div>
            <button onClick={copy}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white">
              {copied ? '✓ 已複製連結' : '複製連結'}
            </button>
          </div>

          <p className="mb-4 text-xs text-slate-400">狀態已記錄為「已派工」，等待工程師回傳</p>

          <a href="/admin"
            className="block w-full rounded-lg border border-slate-300 py-3 text-sm font-medium text-slate-700 text-center">
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
