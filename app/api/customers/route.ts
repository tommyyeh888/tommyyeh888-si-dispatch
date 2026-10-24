import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/customers
 * 同時讀取 dispatch_customers 與 si-crm 的 customers (status = 'active')，自動合併對應：
 * - 保留 dispatch_customers.id 作為 id（讓既有 dispatch_customer_options 專屬維修選項無縫運作）
 * - 帶出 crm_customer_id，供前端聯動查詢 si-crm 的 customer_groups 與 customer_branches
 */
export async function GET() {
  const supabase = getClient();

  const [dispatchRes, crmRes] = await Promise.all([
    supabase.from('dispatch_customers').select('*').order('sort_order'),
    supabase
      .from('customers')
      .select('id, name, store_code, tax_id, owner_name, address, status')
      .eq('status', 'active')
      .order('name'),
  ]);

  if (dispatchRes.error) {
    return NextResponse.json({ error: dispatchRes.error.message }, { status: 500 });
  }

  const dispatchCustomers = dispatchRes.data || [];
  const crmCustomers = crmRes.data || [];

  const result = dispatchCustomers.map((dc) => {
    const matchedCrm =
      crmCustomers.find((c) => c.id === dc.crm_customer_id) ||
      crmCustomers.find(
        (c) =>
          c.name === dc.name ||
          c.name.startsWith(dc.name) ||
          dc.name.startsWith(c.name) ||
          (dc.name.startsWith('爭鮮') && c.name.startsWith('爭鮮'))
      );
    return {
      ...dc,
      crm_customer_id: dc.crm_customer_id || matchedCrm?.id || null,
      crm_code: matchedCrm?.store_code || null,
    };
  });

  // 若 si-crm 有尚未出現在 dispatch_customers 的活躍客戶，也一併列出
  for (const crm of crmCustomers) {
    const alreadyInList = result.some(
      (r) =>
        r.crm_customer_id === crm.id ||
        r.name === crm.name ||
        (r.name.startsWith('爭鮮') && crm.name.startsWith('爭鮮'))
    );
    if (!alreadyInList) {
      result.push({
        id: crm.id,
        name: crm.name,
        sort_order: 999,
        crm_customer_id: crm.id,
        crm_code: crm.store_code || null,
      });
    }
  }

  return NextResponse.json(result);
}

/**
 * POST /api/customers
 * 新增客戶時，同步在 si-crm 的 customers（若同名不存在）與 dispatch_customers 建立並雙向關聯
 */
export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return NextResponse.json({ error: '名稱不能為空' }, { status: 400 });
  }

  const supabase = getClient();

  // 1. 檢查或建立 si-crm 的 customers
  let crmCustomerId: string | null = null;
  const { data: existingCrm } = await supabase
    .from('customers')
    .select('id')
    .eq('name', trimmedName)
    .maybeSingle();

  if (existingCrm?.id) {
    crmCustomerId = existingCrm.id;
  } else {
    const { data: createdCrm } = await supabase
      .from('customers')
      .insert({ name: trimmedName, status: 'active' })
      .select('id')
      .single();
    if (createdCrm?.id) {
      crmCustomerId = createdCrm.id;
    }
  }

  // 2. 建立 dispatch_customers
  const { data: existing } = await supabase
    .from('dispatch_customers')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1);
  const maxOrder = existing?.[0]?.sort_order ?? 0;

  const insertPayload: Record<string, unknown> = {
    name: trimmedName,
    sort_order: maxOrder + 1,
  };
  if (crmCustomerId) {
    insertPayload.crm_customer_id = crmCustomerId;
  }

  let { data, error } = await supabase
    .from('dispatch_customers')
    .insert(insertPayload)
    .select()
    .single();

  // 若尚未執行 Stage 2 SQL 遷移（無 crm_customer_id 欄位），自動退回只寫入 name 與 sort_order
  if (error) {
    const fallback = await supabase
      .from('dispatch_customers')
      .insert({ name: trimmedName, sort_order: maxOrder + 1 })
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
  const { error } = await supabase.from('dispatch_customers').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
