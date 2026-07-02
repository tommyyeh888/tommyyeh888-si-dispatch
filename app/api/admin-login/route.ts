import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    return NextResponse.json({ error: '系統尚未設定後台密碼' }, { status: 500 });
  }
  if (password !== correct) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
  }

  // 取得 IP
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '未知';

  // 取得裝置資訊
  const ua = req.headers.get('user-agent') || '';
  const device = parseDevice(ua);

  // 記錄登入
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from('dispatch_login_logs').insert({
      ip,
      user_agent: ua,
      device,
    });
  } catch { /* 記錄失敗不影響登入 */ }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', correct, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
  return res;
}
