import { NextRequest, NextResponse } from 'next/server';

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = req.cookies.get('admin_auth')?.value;
    const correct = process.env.ADMIN_PASSWORD;
    if (!cookie || !correct || cookie !== correct) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
