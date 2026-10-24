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
 * 從 si-crm 的 customer_groups (事業體/品牌群組) 與 customer_branches (分店門市) 讀取完整階層資料
 */
export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get('customer_id') || '';
  const crmCustomerIdParam = req.nextUrl.searchParams.get('crm_customer_id') || '';
  const customerNameParam = req.nextUrl.searchParams.get('customer_name') || '';

  const supabase = getClient();

  let targetCrmCustomerId = crmCustomerIdParam;

  // 若未直接提供 crm_customer_id，透過 dispatch_customers 或客戶名稱比對 si-crm customers
  if (!targetCrmCustomerId && (customerId || customerNameParam)) {
    let searchName = customerNameParam;
    if (customerId) {
      const { data: dc } = await supabase
        .from('dispatch_customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();

      if (dc && 'crm_customer_id' in dc && dc.crm_customer_id) {
        targetCrmCustomerId = dc.crm_customer_id as string;
      }
      if (!searchName && dc?.name) {
        searchName = dc.name as string;
      }
    }

    if (!targetCrmCustomerId && searchName) {
      const { data: crmList } = await supabase
        .from('customers')
        .select('id, name, status')
        .eq('status', 'active');
      const matched = (crmList || []).find(
        (c) =>
          c.name === searchName ||
          c.name.startsWith(searchName) ||
          searchName.startsWith(c.name) ||
          (searchName.startsWith('爭鮮') && c.name.startsWith('爭鮮'))
      );
      if (matched) targetCrmCustomerId = matched.id;
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
      .select('id, customer_id, name, description, industry')
      .eq('customer_id', targetCrmCustomerId)
      .order('name'),
    supabase
      .from('customer_branches')
      .select(
        'id, customer_id, group_id, name, branch_code, store_code, address, phone, contact_name, device_ip, status'
      )
      .eq('customer_id', targetCrmCustomerId)
      .order('name'),
  ]);

  if (groupsRes.error || branchesRes.error) {
    return NextResponse.json(
      { error: groupsRes.error?.message || branchesRes.error?.message || '讀取門市失敗' },
      { status: 500 }
    );
  }

  const normalizedGroups = (groupsRes.data || []).map((g) => ({
    id: g.id,
    customer_id: g.customer_id,
    name: g.name,
    code: g.industry || null,
    description: g.description || null,
  }));

  const normalizedBranches = (branchesRes.data || [])
    .filter((b) => !b.status || b.status === 'active' || b.status === '營運中')
    .map((b) => ({
      id: b.id,
      customer_id: b.customer_id,
      group_id: b.group_id || null,
      name: b.name,
      code: b.store_code || b.branch_code || null,
      city: null,
      address: b.address || null,
      phone: b.phone || null,
      contact_person: b.contact_name || null,
      device_ip: b.device_ip || null,
      status: b.status || 'active',
    }));

  return NextResponse.json({
    crm_customer_id: targetCrmCustomerId,
    groups: normalizedGroups,
    branches: normalizedBranches,
  });
}
