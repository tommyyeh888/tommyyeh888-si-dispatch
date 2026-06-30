import { NextRequest, NextResponse } from 'next/server';
import { createSeed, encodeSeed } from '@/lib/dispatch';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const seed = createSeed({
    customerName: body.customerName,
    branchName: body.branchName,
    date: body.date,
    projectId: body.projectId,
    machineCount: body.machineCount,
    partCount: body.partCount,
  });

  const token = encodeSeed(seed);
  const origin = req.nextUrl.origin;
  const url = `${origin}/dispatch/${token}`;

  return NextResponse.json({ url, token });
}
