import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getClient();
  const { data, error } = await supabase
    .from('dispatch_customers')
    .select('*')
    .order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: '名稱不能為空' }, { status: 400 });
  const supabase = getClient();
  const { data: existing } = await supabase.from('dispatch_customers').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const maxOrder = existing?.[0]?.sort_order ?? 0;
  const { data, error } = await supabase
    .from('dispatch_customers')
    .insert({ name, sort_order: maxOrder + 1 })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 });
  const supabase = getClient();
  const { error } = await supabase.from('dispatch_customers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
