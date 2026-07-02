import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// 查詢派工單列表
export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get('month'); // 格式 2026-07
  const customerId = req.nextUrl.searchParams.get('customer_id');
  const supabase = getClient();

  let query = supabase
    .from('dispatch_orders')
    .select('id, customer_name, branch, date, status, pdf_drive_url, created_at, token')
    .order('created_at', { ascending: false });

  if (month) {
    const start = `${month}-01`;
    const end = `${month}-31`;
    query = query.gte('date', start).lte('date', end);
  }
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// 建立派工單（後台建單時呼叫）
export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getClient();
  const { data, error } = await supabase
    .from('dispatch_orders')
    .insert({
      customer_id: body.customer_id,
      customer_name: body.customer_name,
      branch: body.branch,
      date: body.date || new Date().toISOString().slice(0, 10),
      status: 'pending',
      token: body.token,
      machines: [],
      selected_options: [],
      parts: [],
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
