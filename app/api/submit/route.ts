import { NextRequest, NextResponse } from 'next/server';
import { generateDispatchPdf } from '@/lib/pdf';
import { uploadDispatchPdf } from '@/lib/drive';
import { createClient } from '@supabase/supabase-js';
import type { DispatchFormData } from '@/lib/dispatch';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as DispatchFormData;

    if (!data.customerName) {
      return NextResponse.json({ error: '缺少必要欄位(客戶名稱)' }, { status: 400 });
    }
    if (!data.customerSignature || !data.engineerSignature) {
      return NextResponse.json({ error: '工程師簽名與客戶簽名皆為必填' }, { status: 400 });
    }

    // 產生 PDF
    const pdfBytes = await generateDispatchPdf(data);

    // 上傳到 Google Drive
    const driveResult = await uploadDispatchPdf(pdfBytes, {
      date: data.date,
      branchName: data.branchName,
      customerName: data.customerName,
    });

    // 存入 Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase.from('dispatch_orders').insert({
      customer_id: data.customerId || null,
      customer_name: data.customerName,
      branch: data.branchName,
      date: data.date,
      machines: data.machines,
      selected_options: data.selectedOptions || [],
      content_note: data.content,
      parts: data.parts,
      engineer_signature: data.engineerSignature,
      customer_signature: data.customerSignature,
      pdf_drive_url: driveResult.webViewLink,
    });

    return NextResponse.json({ ok: true, ...driveResult });
  } catch (err) {
    console.error('送出派工單失敗:', err);
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: `送出失敗: ${message}` }, { status: 500 });
  }
}
