import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 取得某客戶已勾選的選項 ID 列表
export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id');
  if (!customerId) return NextResponse.json({ error: '缺少 customer_id' }, { status: 400 });
  const supabase = getClient();
  const { data, error } = await supabase
    .from('dispatch_customer_options')
    .select('option_id')
    .eq('customer_id', customerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.map(r => r.option_id) || []);
}

// 更新某客戶的選項（全量替換）
export async function POST(req: NextRequest) {
  const { customer_id, option_ids } = await req.json();
  if (!customer_id) return NextResponse.json({ error: '缺少 customer_id' }, { status: 400 });
  const supabase = getClient();

  // 先刪除舊的
  await supabase.from('dispatch_customer_options').delete().eq('customer_id', customer_id);

  // 再新增新的
  if (option_ids && option_ids.length > 0) {
    const rows = option_ids.map((option_id: string) => ({ customer_id, option_id }));
    const { error } = await supabase.from('dispatch_customer_options').insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
