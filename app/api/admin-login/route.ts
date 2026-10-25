import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  ADMIN_COOKIE_NAME,
  ADMIN_EMAIL_COOKIE_NAME,
  createStaffSessionToken,
  getExpectedAuthToken,
  hashPassword,
} from '@/lib/auth';

function parseDevice(ua: string): string {
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Linux/.test(ua)) return 'Linux';
  return '未知裝置';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!password) {
    return NextResponse.json({ error: '請輸入密碼' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || serviceRoleKey;

  let authenticatedEmail = '';
  let authMethod: 'supabase_auth' | 'legacy_password' = 'legacy_password';
  let tokenValue = '';

  if (email) {
    // 方式 A：使用 Supabase Auth 驗證員工個人帳號 (Email + Password)
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: '員工帳號或密碼錯誤，請確認已在 Supabase Auth 建立帳號' },
        { status: 401 }
      );
    }

    authenticatedEmail = authData.user.email || email;
    authMethod = 'supabase_auth';
    tokenValue = await createStaffSessionToken(authenticatedEmail);
  } else {
    // 方式 B：向下相容 ADMIN_PASSWORD 共用後台密碼（支援 sha256:<hash> 或明文）
    const expectedToken = await getExpectedAuthToken();
    if (!expectedToken) {
      return NextResponse.json(
        { error: '系統已停用共用密碼，請使用員工 Email 帳號登入' },
        { status: 401 }
      );
    }
    const inputToken = await hashPassword(password);
    if (inputToken !== expectedToken) {
      return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
    }
    authenticatedEmail = 'admin@shared-password';
    authMethod = 'legacy_password';
    tokenValue = expectedToken;
  }

  // 取得 IP 與裝置資訊
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '未知';
  const ua = req.headers.get('user-agent') || '';
  const device = parseDevice(ua);

  // 記錄登入（優先寫入含 email 與 auth_method 的 Stage 2 欄位；若尚未跑 SQL migration 則自動 fallback）
  try {
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);
    const { error: logErr } = await adminSupabase.from('dispatch_login_logs').insert({
      ip,
      user_agent: ua,
      device,
      email: authenticatedEmail,
      auth_method: authMethod,
    });
    if (logErr) {
      await adminSupabase.from('dispatch_login_logs').insert({
        ip,
        user_agent: ua,
        device,
      });
    }
  } catch {
    /* 記錄失敗不影響登入 */
  }

  const res = NextResponse.json({
    ok: true,
    email: authenticatedEmail,
    authMethod,
  });

  res.cookies.set(ADMIN_COOKIE_NAME, tokenValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  res.cookies.set(ADMIN_EMAIL_COOKIE_NAME, authenticatedEmail, {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });

  return res;
}
