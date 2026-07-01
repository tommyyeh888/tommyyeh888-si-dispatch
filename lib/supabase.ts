import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('缺少 Supabase 環境變數');
  _client = createClient(url, key);
  return _client;
}

// 方便使用的 proxy，在 client 端呼叫時自動初始化
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});

export interface Customer {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ServiceOption {
  id: string;
  label: string;
  sort_order: number;
  created_at: string;
}
