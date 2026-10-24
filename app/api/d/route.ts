import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: '缺少短碼' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 僅回傳填單所需欄位與 short_code，不外洩內部 UUID id 或舊 token
  const { data, error } = await supabase
    .from('dispatch_orders')
    .select('customer_name, branch, customer_id, short_code, status')
    .eq('short_code', code)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: '找不到此派工單' }, { status: 404 });
  }

  if (data.status !== 'pending') {
    return NextResponse.json({ error: '此派工單已完成回傳' }, { status: 410 });
  }

  return NextResponse.json(data);
}
