import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/branches?customer_id=...&crm_customer_id=...&customer_name=...
 * 從 si-crm 的 customer_groups (品牌群組) 與 customer_branches (分店門市) 讀取完整階層資料
 */
export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id') || '';
  const crmCustomerIdParam = req.nextUrl.searchParams.get('crm_customer_id') || '';
  const customerNameParam = req.nextUrl.searchParams.get('customer_name') || '';

  const supabase = getClient();

  let targetCrmCustomerId = crmCustomerIdParam;

  // 若未直接提供 crm_customer_id，透過 dispatch_customers 或客戶名稱比對 si-crm customers
  if (!targetCrmCustomerId && customerId) {
    const { data: dc } = await supabase
      .from('dispatch_customers')
      .select('id, name, crm_customer_id')
      .eq('id', customerId)
      .maybeSingle();

    if (dc?.crm_customer_id) {
      targetCrmCustomerId = dc.crm_customer_id;
    } else {
      const searchName = dc?.name || customerNameParam;
      if (searchName) {
        const { data: crmList } = await supabase
          .from('customers')
          .select('id, name')
          .eq('is_active', true);
        const matched = (crmList || []).find(
          (c) =>
            c.name === searchName ||
            c.name.startsWith(searchName) ||
            searchName.startsWith(c.name)
        );
        if (matched) targetCrmCustomerId = matched.id;
      }
    }
  }

  if (!targetCrmCustomerId) {
    return NextResponse.json({
      crm_customer_id: null,
      groups: [],
      branches: [],
    });
  }

  const [groupsRes, branchesRes] = await Promise.all([
    supabase
      .from('customer_groups')
      .select('id, customer_id, name, code, description, is_active')
      .eq('customer_id', targetCrmCustomerId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('customer_branches')
      .select(
        'id, customer_id, group_id, name, code, city, address, phone, contact_person, status, is_active'
      )
      .eq('customer_id', targetCrmCustomerId)
      .eq('is_active', true)
      .order('name'),
  ]);

  if (groupsRes.error || branchesRes.error) {
    return NextResponse.json(
      { error: groupsRes.error?.message || branchesRes.error?.message || '讀取門市失敗' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    crm_customer_id: targetCrmCustomerId,
    groups: groupsRes.data || [],
    branches: branchesRes.data || [],
  });
}
