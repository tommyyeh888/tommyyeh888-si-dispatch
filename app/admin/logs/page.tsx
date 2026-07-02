'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

interface LoginLog {
  id: string;
  ip: string;
  device: string;
  user_agent: string;
  logged_in_at: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/login-logs')
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <a href="/admin/settings" className="text-sm text-slate-500 underline">← 返回</a>
          <h1 className="text-xl font-semibold text-slate-900">登入紀錄</h1>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-400 py-8">載入中...</p>
        ) : logs.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">尚無登入紀錄</p>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{log.device}</p>
                    <p className="text-sm text-slate-500">IP：{log.ip}</p>
                    <p className="mt-1 text-xs text-slate-400 break-all">{log.user_agent}</p>
                  </div>
                  <p className="shrink-0 text-xs text-slate-400 ml-2">{formatTime(log.logged_in_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
