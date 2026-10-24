import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: '缺少短碼' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. 優先讀取含 Stage 2 門市欄位之派工單；若尚未執行 SQL 遷移則自動退回基礎查詢
  let orderData: {
    customer_name: string;
    branch: string;
    customer_id: string;
    short_code: string;
    status: string;
    branch_id?: string | null;
    branch_address?: string | null;
    branch_phone?: string | null;
    branch_contact_person?: string | null;
  } | null = null;

  const { data: extData, error: extError } = await supabase
    .from('dispatch_orders')
    .select(
      'customer_name, branch, customer_id, short_code, status, branch_id, branch_address, branch_phone, branch_contact_person'
    )
    .eq('short_code', code)
    .maybeSingle();

  if (!extError && extData) {
    orderData = extData;
  } else {
    const { data: baseData, error: baseError } = await supabase
      .from('dispatch_orders')
      .select('customer_name, branch, customer_id, short_code, status')
      .eq('short_code', code)
      .maybeSingle();

    if (baseError || !baseData) {
      return NextResponse.json({ error: '找不到此派工單' }, { status: 404 });
    }
    orderData = baseData;
  }

  if (orderData.status !== 'pending') {
    return NextResponse.json({ error: '此派工單已完成回傳' }, { status: 410 });
  }

  // 2. 若有 branch_id 或分店名稱，從 si-crm 的 customer_branches 補齊地址/電話/預設聯絡人
  let branchAddress = orderData.branch_address || null;
  let branchPhone = orderData.branch_phone || null;
  let branchContactPerson = orderData.branch_contact_person || null;

  if (!branchAddress && !branchPhone && !branchContactPerson) {
    if (orderData.branch_id) {
      const { data: b } = await supabase
        .from('customer_branches')
        .select('address, phone, contact_person')
        .eq('id', orderData.branch_id)
        .maybeSingle();
      if (b) {
        branchAddress = b.address || null;
        branchPhone = b.phone || null;
        branchContactPerson = b.contact_person || null;
      }
    } else if (orderData.branch) {
      const { data: b } = await supabase
        .from('customer_branches')
        .select('address, phone, contact_person')
        .eq('name', orderData.branch)
        .limit(1)
        .maybeSingle();
      if (b) {
        branchAddress = b.address || null;
        branchPhone = b.phone || null;
        branchContactPerson = b.contact_person || null;
      }
    }
  }

  return NextResponse.json({
    customer_name: orderData.customer_name,
    branch: orderData.branch,
    customer_id: orderData.customer_id,
    short_code: orderData.short_code,
    status: orderData.status,
    branch_address: branchAddress,
    branch_phone: branchPhone,
    branch_contact_person: branchContactPerson,
  });
}
