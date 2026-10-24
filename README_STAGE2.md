# SI-Dispatch 第二階段升級包 (`stage2-crm-auth`)

本升級包基於 **v28 資安修補版 (`be38353`)** 演進，目標是讓 **SI-Dispatch 派工系統** 與 **si-crm 維運資產管理系統** 共用同一套 Supabase 客戶／品牌群組／分店門市主檔與員工個人帳號登入。

---

## 一、包含之完整可執行檔案清單

1. **`supabase_stage2_migration.sql`**
   - 擴充 `dispatch_customers` 新增 `crm_customer_id uuid references customers(id)`，並自動將現有客戶與 `si-crm` 的 `customers` 進行雙向配對與補齊。
   - 擴充 `dispatch_orders` 新增 `crm_customer_id`、`branch_id`、`ticket_id`、`branch_address`、`branch_phone`、`branch_contact_person`、`created_by_email`。
   - 擴充 `dispatch_login_logs` 新增 `email`、`auth_method`。
   - 為 `si-crm` 16 張表與 `SI-Dispatch` 6 張表啟用 RLS 並設定 `authenticated` 員工政策（後端 `SUPABASE_SERVICE_ROLE_KEY` 預設繞過 RLS，不影響現有 API，同時防止 Anon Key 裸讀）。

2. **Next.js 完整檔案（可直接覆寫至 `C:\Users\Tommy Yeh\Desktop\si-dispatch`）**
   - `lib/auth.ts`：支援 Supabase Auth 員工 HMAC-SHA256 Session Token（記錄員工 Email）與舊版 `ADMIN_PASSWORD` SHA-256 Token 雙軌過渡。
   - `proxy.ts`：保護 `/admin/*`、`/api/orders`、`/api/login-logs`、`/api/branches` 及設定寫入 API。
   - `app/api/admin-login/route.ts`：支援員工 Email + 密碼（透過 Supabase Auth `signInWithPassword`）與舊版密碼登入，並將登入者 Email 寫入 `dispatch_login_logs`。
   - `app/admin/login/page.tsx`：提供「員工帳號登入」與「舊版管理密碼」切換頁籤。
   - `app/admin/logs/page.tsx`：於後台登入紀錄顯示登入員工之 Email 標籤。
   - `app/api/customers/route.ts`：自動整合 `dispatch_customers` 與 `si-crm` 的 `customers`，新增客戶時同步寫入雙表。
   - `app/api/branches/route.ts`：根據客戶讀取 `si-crm` 的 `customer_groups`（品牌群組）與 `customer_branches`（門市清單、地址、電話、聯絡人）。
   - `app/api/orders/route.ts`：開立派工單時寫入 `branch_id`、門市聯絡資訊快照與 `created_by_email`；手動輸入新分店時自動同步新增至 `si-crm` 的 `customer_branches`。
   - `app/admin/create/page.tsx`：後台新增派工單支援「客戶 → 品牌群組篩選 → SI-CRM 門市下拉選單（即時預覽地址/電話/聯絡人）」，並支援切換「+ 手動輸入新分店」。
   - `app/admin/orders/page.tsx`：查詢派工單列表顯示開單人員 Email。
   - `app/api/d/route.ts`：短碼查詢回傳門市地址、電話與預設聯絡人（相容尚未執行 SQL 遷移前的環境）。
   - `app/d/[code]/page.tsx`：工程師填單頁顯示門市地址、可點擊撥號之門市電話、自動帶入預設聯絡人，機器序號維持由工程師現場手填。
   - `app/api/submit/route.ts`：維持 v28 短碼格式與 `pending` 狀態原子更新保護。
