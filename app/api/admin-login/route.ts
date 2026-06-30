import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const correct = process.env.ADMIN_PASSWORD;

  if (!correct) {
    return NextResponse.json(
      { error: '系統尚未設定後台密碼(ADMIN_PASSWORD)' },
      { status: 500 }
    );
  }

  if (password !== correct) {
    return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('admin_auth', correct, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 天
    path: '/',
  });
  return res;
}
