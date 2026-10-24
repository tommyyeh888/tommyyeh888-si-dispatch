/**
 * SI-Dispatch v29 (Stage 2) 驗證與身份識別模組 (lib/auth.ts)
 * 1. 使用 Web Crypto API 計算 SHA-256 / HMAC-SHA256，完全相容於 Next.js Edge Runtime (proxy.ts) 與 Node.js API Route。
 * 2. 同時支援：
 *    - 方式 A：Supabase Auth 員工個人帳號登入（發放 HMAC 簽章 Session Token，內含員工 Email 與有效期限）
 *    - 方式 B：原有的 ADMIN_PASSWORD 後台密碼登入（向下相容過渡期，避免切換時鎖死）
 * 3. 絕對不將明文 ADMIN_PASSWORD 存入瀏覽器 Cookie。
 */

export const ADMIN_COOKIE_NAME = 'admin_auth';
export const ADMIN_EMAIL_COOKIE_NAME = 'admin_email';

const SESSION_PREFIX = 's2';

function getSigningSecret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'si-dispatch-stage2-fallback-secret'
  );
}

function toHex(buffer: ArrayBuffer): string {
  const bytes = Array.from(new Uint8Array(buffer));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url: string): string {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * v28 相容：計算 ADMIN_PASSWORD 的 SHA-256 雜湊值
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`si-dispatch-v28:${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

export async function getExpectedAuthToken(): Promise<string | null> {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return hashPassword(password);
}

/**
 * Stage 2：使用 Web Crypto HMAC-SHA256 簽署員工登入 Session Token
 * 格式：s2.<base64url(email|expMs)>.<hexSignature>
 */
export async function createStaffSessionToken(
  email: string,
  ttlSeconds = 60 * 60 * 24 * 30
): Promise<string> {
  const expMs = Date.now() + ttlSeconds * 1000;
  const payload = `${email.trim().toLowerCase()}|${expMs}`;
  const encodedPayload = toBase64Url(payload);
  const sig = await hmacSign(`${SESSION_PREFIX}.${encodedPayload}`);
  return `${SESSION_PREFIX}.${encodedPayload}.${sig}`;
}

async function hmacSign(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(`si-dispatch-hmac:${getSigningSecret()}`);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message));
  return toHex(sigBuffer);
}

export interface VerifiedAdminSession {
  valid: boolean;
  email: string | null;
  method: 'supabase_auth' | 'legacy_password' | null;
}

/**
 * 驗證 admin_auth Cookie，支援 Stage 2 員工 HMAC Token 與 v28 舊版雜湊 Token
 */
export async function verifyAdminSession(
  cookieValue: string | undefined
): Promise<VerifiedAdminSession> {
  if (!cookieValue) {
    return { valid: false, email: null, method: null };
  }

  // 1. 檢查是否為 Stage 2 簽章 Token (s2.<payload>.<sig>)
  if (cookieValue.startsWith(`${SESSION_PREFIX}.`)) {
    const parts = cookieValue.split('.');
    if (parts.length === 3) {
      const [, encodedPayload, providedSig] = parts;
      const expectedSig = await hmacSign(`${SESSION_PREFIX}.${encodedPayload}`);
      if (providedSig === expectedSig) {
        try {
          const decoded = fromBase64Url(encodedPayload);
          const [email, expStr] = decoded.split('|');
          const expMs = Number(expStr);
          if (email && Number.isFinite(expMs) && Date.now() < expMs) {
            return {
              valid: true,
              email,
              method: email === 'admin@shared-password' ? 'legacy_password' : 'supabase_auth',
            };
          }
        } catch {
          return { valid: false, email: null, method: null };
        }
      }
    }
    return { valid: false, email: null, method: null };
  }

  // 2. 向下相容 v28 SHA-256(ADMIN_PASSWORD) Cookie
  const expected = await getExpectedAuthToken();
  if (expected && cookieValue === expected) {
    return { valid: true, email: 'admin@shared-password', method: 'legacy_password' };
  }

  return { valid: false, email: null, method: null };
}

export async function verifyAdminCookie(cookieValue: string | undefined): Promise<boolean> {
  const session = await verifyAdminSession(cookieValue);
  return session.valid;
}
