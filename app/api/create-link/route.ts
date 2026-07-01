import { NextRequest, NextResponse } from 'next/server';
import { createSeed, encodeSeed } from '@/lib/dispatch';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const seed = createSeed({
    customerName: body.customerName,
    branchName: body.branchName,
    customerId: body.customerId || '',
    projectId: body.projectId,
  });
  const token = encodeSeed(seed);
  const origin = req.nextUrl.origin;
  return NextResponse.json({ url: `${origin}/dispatch/${token}`, token });
}
