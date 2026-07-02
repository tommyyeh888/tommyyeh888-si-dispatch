import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateShortCode } from '@/lib/shortcode';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month');
  const customerId = req.nextUrl.searchParams.get('customer_id');
  const supabase = getClient();

  let query = supabase
    .from('dispatch_orders')
    .select('id, customer_name, branch, date, status, pdf_drive_url, created_at, short_code')
    .order('created_at', { ascending: false });

  if (month) {
    query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  }
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getClient();

  // 產生唯一短碼（最多嘗試 5 次避免碰撞）
  let short_code = '';
  for (let i = 0; i < 5; i++) {
    const code = generateShortCode();
    const { data } = await supabase
      .from('dispatch_orders')
      .select('id')
      .eq('short_code', code)
      .single();
    if (!data) { short_code = code; break; }
  }

  const { data, error } = await supabase
    .from('dispatch_orders')
    .insert({
      customer_id: body.customer_id,
      customer_name: body.customer_name,
      branch: body.branch,
      date: body.date || new Date().toISOString().slice(0, 10),
      status: 'pending',
      token: body.token || '',
      short_code,
      machines: [],
      selected_options: [],
      parts: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = getClient();
  const { error } = await supabase.from('dispatch_orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
