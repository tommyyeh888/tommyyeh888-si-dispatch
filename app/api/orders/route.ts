import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateShortCode } from '@/lib/shortcode';
import { ADMIN_COOKIE_NAME, verifyAdminSession } from '@/lib/auth';

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
    .select(
      'id, customer_name, branch, branch_id, date, status, pdf_drive_url, created_at, short_code, created_by_email'
    )
    .order('created_at', { ascending: false });

  if (month) {
    query = query.gte('date', `${month}-01`).lte('date', `${month}-31`);
  }
  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  let { data, error } = await query;

  // 若尚未執行 Stage 2 SQL 遷移（無 branch_id / created_by_email 欄位），自動退回基礎查詢
  if (error) {
    let fallbackQuery = supabase
      .from('dispatch_orders')
      .select('id, customer_name, branch, date, status, pdf_drive_url, created_at, short_code')
      .order('created_at', { ascending: false });
    if (month) {
      fallbackQuery = fallbackQuery.gte('date', `${month}-01`).lte('date', `${month}-31`);
    }
    if (customerId) {
      fallbackQuery = fallbackQuery.eq('customer_id', customerId);
    }
    const fallbackRes = await fallbackQuery;
    data = fallbackRes.data as typeof data;
    error = fallbackRes.error;
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const supabase = getClient();

  // 解析建立派工單的登入者 Email
  const cookieVal = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const session = await verifyAdminSession(cookieVal);
  const createdByEmail = session.email || null;

  // 產生唯一短碼（最多嘗試 5 次避免碰撞）
  let short_code = '';
  for (let i = 0; i < 5; i++) {
    const code = generateShortCode();
    const { data } = await supabase
      .from('dispatch_orders')
      .select('id')
      .eq('short_code', code)
      .maybeSingle();
    if (!data) {
      short_code = code;
      break;
    }
  }

  // 品牌群組與分店目前皆採手動輸入，不從 si-crm 的 customer_branches 自動帶入或同步未確認之門市資料
  const branchId: string | null = body.branch_id || null;
  const branchAddress: string | null = body.branch_address || null;
  const branchPhone: string | null = body.branch_phone || null;
  const branchContactPerson: string | null = body.branch_contact_person || null;
  const crmCustomerId: string | null = body.crm_customer_id || null;
  const branchName = typeof body.branch === 'string' ? body.branch.trim() : '';

  const baseInsert = {
    customer_id: body.customer_id,
    customer_name: body.customer_name,
    branch: branchName,
    date: body.date || new Date().toISOString().slice(0, 10),
    status: 'pending',
    token: body.token || '',
    short_code,
    machines: [],
    selected_options: [],
    parts: [],
  };

  const stage2Insert = {
    ...baseInsert,
    crm_customer_id: crmCustomerId,
    branch_id: branchId,
    ticket_id: body.ticket_id || null,
    branch_address: branchAddress,
    branch_phone: branchPhone,
    branch_contact_person: branchContactPerson,
    created_by_email: createdByEmail,
  };

  let { data, error } = await supabase
    .from('dispatch_orders')
    .insert(stage2Insert)
    .select()
    .single();

  // 若尚未執行 Stage 2 SQL 遷移，自動退回基礎欄位寫入，確保不中斷營運
  if (error) {
    const fallback = await supabase
      .from('dispatch_orders')
      .insert(baseInsert)
      .select()
      .single();
    data = fallback.data;
    error = fallback.error;
  }

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
