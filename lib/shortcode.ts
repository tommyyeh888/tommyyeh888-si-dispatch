// 產生 6 碼短碼（大寫字母+數字，排除容易混淆的 0/O/I/1）
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateShortCode(): string {
  return Array.from({ length: 6 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}
