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

  // 若為手動輸入的新分店，且屬於已知的 si-crm 客戶，可自動同步寫入 customer_branches
  let branchId: string | null = body.branch_id || null;
  let branchAddress: string | null = body.branch_address || null;
  let branchPhone: string | null = body.branch_phone || null;
  let branchContactPerson: string | null = body.branch_contact_person || null;
  const crmCustomerId: string | null = body.crm_customer_id || null;
  const branchName = typeof body.branch === 'string' ? body.branch.trim() : '';

  if (branchId) {
    const { data: branchRow } = await supabase
      .from('customer_branches')
      .select('id, name, address, phone, contact_name')
      .eq('id', branchId)
      .maybeSingle();
    if (branchRow) {
      branchAddress = branchAddress || branchRow.address || null;
      branchPhone = branchPhone || branchRow.phone || null;
      branchContactPerson = branchContactPerson || branchRow.contact_name || null;
    }
  } else if (branchName && crmCustomerId && body.sync_new_branch_to_crm !== false) {
    // 檢查是否已有同名分店，若無則自動幫 si-crm 新增此分店
    const { data: existingBranch } = await supabase
      .from('customer_branches')
      .select('id, address, phone, contact_name')
      .eq('customer_id', crmCustomerId)
      .eq('name', branchName)
      .maybeSingle();

    if (existingBranch) {
      branchId = existingBranch.id;
      branchAddress = branchAddress || existingBranch.address || null;
      branchPhone = branchPhone || existingBranch.phone || null;
      branchContactPerson = branchContactPerson || existingBranch.contact_name || null;
    } else {
      const { data: newBranch } = await supabase
        .from('customer_branches')
        .insert({
          customer_id: crmCustomerId,
          group_id: body.group_id || null,
          name: branchName,
          address: branchAddress,
          phone: branchPhone,
          contact_name: branchContactPerson,
          status: 'active',
        })
        .select('id')
        .maybeSingle();
      if (newBranch?.id) {
        branchId = newBranch.id;
      }
    }
  }

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
