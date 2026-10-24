import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, verifyAdminCookie } from '@/lib/auth';

/**
 * SI-Dispatch v29 (Stage 2) 登入關卡 (proxy.ts)
 * 1. 保護所有 /admin/* 頁面（/admin/login 除外），未登入導向 /admin/login
 * 2. 保護後台管理 API：
 *    - /api/orders、/api/orders/[id]、/api/login-logs、/api/branches：所有受保護操作須驗證 Cookie
 *    - /api/customers、/api/customer-options、/api/service-options：GET 開放給工程師填單頁讀取，非 GET 須驗證 Cookie
 * 3. 支援 Supabase Auth 員工個人帳號 HMAC Session Cookie 與 v28 SHA-256 Cookie 雙重相容
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();

  // 1. 後台頁面保護
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = await verifyAdminCookie(cookie);
    if (!isValid) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 2. 後台完全受保護之 API (所有 Method 均需登入)
  const isAdminOnlyApi =
    pathname.startsWith('/api/orders') ||
    pathname.startsWith('/api/login-logs') ||
    pathname.startsWith('/api/branches');

  // 3. 讀取開放給填單頁、但寫入/刪除必須登入之設定 API
  const isWriteProtectedApi =
    (pathname.startsWith('/api/customers') ||
      pathname.startsWith('/api/customer-options') ||
      pathname.startsWith('/api/service-options')) &&
    method !== 'GET' &&
    method !== 'HEAD' &&
    method !== 'OPTIONS';

  if (isAdminOnlyApi || isWriteProtectedApi) {
    const cookie = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const isValid = await verifyAdminCookie(cookie);
    if (!isValid) {
      return NextResponse.json({ error: '未授權，請先登入後台' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/orders/:path*',
    '/api/login-logs/:path*',
    '/api/branches/:path*',
    '/api/customers/:path*',
    '/api/customer-options/:path*',
    '/api/service-options/:path*',
  ],
};
