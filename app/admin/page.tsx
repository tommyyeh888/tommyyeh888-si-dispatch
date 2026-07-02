'use client';
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">聚英資訊 派工系統</h1>
          <p className="mt-1 text-sm text-slate-500">後台管理</p>
        </div>

        <div className="space-y-3">
          <a href="/admin/create" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-2xl text-white">📋</div>
            <div>
              <p className="font-semibold text-slate-900">新增派工單</p>
              <p className="text-sm text-slate-500">建立新的派工單並產生工程師連結</p>
            </div>
            <span className="ml-auto text-slate-300">›</span>
          </a>

          <a href="/admin/orders" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-2xl text-white">🔍</div>
            <div>
              <p className="font-semibold text-slate-900">查詢派工單</p>
              <p className="text-sm text-slate-500">查看歷史派工紀錄與回傳狀態</p>
            </div>
            <span className="ml-auto text-slate-300">›</span>
          </a>

          <a href="/admin/settings" className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-500 text-2xl text-white">⚙️</div>
            <div>
              <p className="font-semibold text-slate-900">系統設定</p>
              <p className="text-sm text-slate-500">管理客戶清單與維修保養選項</p>
            </div>
            <span className="ml-auto text-slate-300">›</span>
          </a>
        </div>
      </div>
    </div>
  );
}
