/**
 * SI-Dispatch v28 驗證模組 (lib/auth.ts)
 * 使用 Web Crypto API 計算 SHA-256，相容於 Next.js Edge Runtime (proxy.ts) 與 Node.js API Route。
 * 避免將明文 ADMIN_PASSWORD 直接存入瀏覽器 Cookie。
 */

export const ADMIN_COOKIE_NAME = 'admin_auth';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`si-dispatch-v28:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function getExpectedAuthToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return hashPassword(password);
}

export async function verifyAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await getExpectedAuthToken();
  if (!expected) return false;
  return cookieValue === expected;
}
