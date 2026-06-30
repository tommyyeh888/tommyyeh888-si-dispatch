import { NextRequest, NextResponse } from 'next/server';
import { generateDispatchPdf } from '@/lib/pdf';
import { uploadDispatchPdf } from '@/lib/drive';
import type { DispatchFormData } from '@/lib/dispatch';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as DispatchFormData;

    if (!data.customerName || !data.date) {
      return NextResponse.json(
        { error: '缺少必要欄位(客戶名稱、日期)' },
        { status: 400 }
      );
    }
    if (!data.customerSignature || !data.engineerSignature) {
      return NextResponse.json(
        { error: '工程師簽名與客戶簽名皆為必填' },
        { status: 400 }
      );
    }

    const pdfBytes = await generateDispatchPdf(data);

    const result = await uploadDispatchPdf(pdfBytes, {
      date: data.date,
      branchName: data.branchName,
      customerName: data.customerName,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('送出派工單失敗:', err);
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json(
      { error: `送出失敗: ${message}` },
      { status: 500 }
    );
  }
}
