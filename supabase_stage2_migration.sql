-- ============================================================================
-- SI-Dispatch 第二階段升級 SQL 遷移檔 (supabase_stage2_migration.sql)
-- 目標：
-- 1. 打通 SI-Dispatch 與 si-crm 共用客戶 (customers) / 品牌群組 (customer_groups) / 門市 (customer_branches)
-- 2. 擴充 dispatch_orders 支援 branch_id、ticket_id、created_by_email 與門市聯絡資訊快照
-- 3. 擴充 dispatch_login_logs 支援 email 記錄 (Supabase Auth 員工個人帳號登入)
-- 4. 針對 si-crm 16 張表與 SI-Dispatch 6 張表啟用 RLS 並建立 authenticated 政策
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. 擴充 dispatch_customers：連結 si-crm 的 customers(id)
-- ----------------------------------------------------------------------------
ALTER TABLE public.dispatch_customers
  ADD COLUMN IF NOT EXISTS crm_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

-- 自動將名稱相符的既有 dispatch_customers 與 si-crm customers 建立連結
UPDATE public.dispatch_customers dc
SET crm_customer_id = c.id
FROM public.customers c
WHERE dc.crm_customer_id IS NULL
  AND (
    dc.name = c.name
    OR (dc.name LIKE '爭鮮%' AND c.name LIKE '爭鮮%')
    OR (c.name LIKE dc.name || '%')
    OR (dc.name LIKE c.name || '%')
  );

-- 確保 si-crm 的所有活躍客戶在 dispatch_customers 都有對應項目（方便「設定客戶專屬維修選項」使用）
INSERT INTO public.dispatch_customers (name, sort_order, crm_customer_id)
SELECT
  c.name,
  COALESCE((SELECT MAX(sort_order) FROM public.dispatch_customers), 0) + ROW_NUMBER() OVER (ORDER BY c.created_at),
  c.id
FROM public.customers c
WHERE c.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM public.dispatch_customers dc
    WHERE dc.crm_customer_id = c.id OR dc.name = c.name
  );

-- ----------------------------------------------------------------------------
-- 2. 擴充 dispatch_orders：支援 si-crm 門市 (branch_id)、報修單 (ticket_id) 與建立人 Email
-- ----------------------------------------------------------------------------
ALTER TABLE public.dispatch_orders
  ADD COLUMN IF NOT EXISTS crm_customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.customer_branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS branch_address text,
  ADD COLUMN IF NOT EXISTS branch_phone text,
  ADD COLUMN IF NOT EXISTS branch_contact_person text,
  ADD COLUMN IF NOT EXISTS created_by_email text;

CREATE INDEX IF NOT EXISTS idx_dispatch_orders_short_code ON public.dispatch_orders(short_code);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_branch_id ON public.dispatch_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_orders_crm_customer_id ON public.dispatch_orders(crm_customer_id);

-- ----------------------------------------------------------------------------
-- 3. 擴充 dispatch_login_logs：記錄登入員工 Email 與登入方式
-- ----------------------------------------------------------------------------
ALTER TABLE public.dispatch_login_logs
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'password';

-- ----------------------------------------------------------------------------
-- 4. 建立 Helper Function：檢查是否為已驗證之內部員工 (authenticated)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_authenticated_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated';
$$;

-- ----------------------------------------------------------------------------
-- 5. 為 SI-Dispatch 6 張表與 si-crm 16 張表啟用 RLS 並設定 authenticated 政策
--    註：後端 API 使用 SUPABASE_SERVICE_ROLE_KEY 預設 bypass RLS，前端/Anon 無法直接裸讀
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
  all_tables text[] := ARRAY[
    -- SI-Dispatch 6 張表
    'dispatch_orders',
    'dispatch_customers',
    'dispatch_service_options',
    'dispatch_customer_options',
    'dispatch_login_logs',
    'dispatch_settings',
    -- si-crm 16 張表
    'customers',
    'customer_groups',
    'customer_branches',
    'customer_contacts',
    'equipment_categories',
    'equipment_brands',
    'equipment_models',
    'customer_equipment',
    'inventory_equipment',
    'maintenance_contracts',
    'contract_equipment',
    'engineers',
    'dispatch_types',
    'engineer_dispatch_rates',
    'tickets',
    'ticket_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY all_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

      -- 建立 authenticated 員工完整存取政策（若尚未存在）
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl AND policyname = 'staff_authenticated_all'
      ) THEN
        EXECUTE format(
          'CREATE POLICY staff_authenticated_all ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
          tbl
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

COMMIT;
