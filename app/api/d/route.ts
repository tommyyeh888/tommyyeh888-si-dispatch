import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: '缺少短碼' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 優先讀取含 Stage 2 欄位之派工單；若尚未執行 SQL 遷移則自動退回基礎查詢
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

  // 直接回傳後台開單時手填之資訊，不自動反查 customer_branches 避免帶入錯誤測試門市資料
  return NextResponse.json({
    customer_name: orderData.customer_name,
    branch: orderData.branch,
    customer_id: orderData.customer_id,
    short_code: orderData.short_code,
    status: orderData.status,
    branch_address: orderData.branch_address || null,
    branch_phone: orderData.branch_phone || null,
    branch_contact_person: orderData.branch_contact_person || null,
  });
}
