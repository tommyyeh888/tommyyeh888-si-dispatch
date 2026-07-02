import { NextRequest, NextResponse } from 'next/server';
import { generateDispatchPdf } from '@/lib/pdf';
import { uploadDispatchPdf } from '@/lib/drive';
import { sendLineMessage } from '@/lib/line';
import { createClient } from '@supabase/supabase-js';
import type { DispatchFormData } from '@/lib/dispatch';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as DispatchFormData & { token?: string };

    if (!data.customerName) {
      return NextResponse.json({ error: '缺少必要欄位(客戶名稱)' }, { status: 400 });
    }
    if (!data.customerSignature || !data.engineerSignature) {
      return NextResponse.json({ error: '工程師簽名與客戶簽名皆為必填' }, { status: 400 });
    }

    const pdfBytes = await generateDispatchPdf(data);
    const driveResult = await uploadDispatchPdf(pdfBytes, {
      date: data.date,
      branchName: data.branchName,
      customerName: data.customerName,
    });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (data.token) {
      await supabase
        .from('dispatch_orders')
        .update({
          date: data.date,
          machines: data.machines,
          selected_options: data.selectedOptions || [],
          content_note: data.content,
          parts: data.parts,
          engineer_signature: data.engineerSignature,
          customer_signature: data.customerSignature,
          pdf_drive_url: driveResult.webViewLink,
          status: 'completed',
        })
        .eq('token', data.token);
    } else {
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
        status: 'completed',
      });
    }

    // LINE 群組通知
    const selectedOpts = (data.selectedOptions || []).join('、') || '無';
    const machines = data.machines.filter(m => m.no).map(m => m.no).join('、') || '無';
    const lineMsg = [
      '✅ 派工單已回傳',
      `📋 客戶：${data.customerName}${data.branchName ? ` / ${data.branchName}` : ''}`,
      `📅 日期：${data.date}`,
      `🔧 維修項目：${selectedOpts}`,
      machines !== '無' ? `🖥️ 機器序號：${machines}` : null,
      data.content ? `📝 補充：${data.content}` : null,
      `📄 查看PDF：${driveResult.webViewLink}`,
    ].filter(Boolean).join('\n');

    await sendLineMessage(lineMsg);

    return NextResponse.json({ ok: true, ...driveResult });
  } catch (err) {
    console.error('送出派工單失敗:', err);
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: `送出失敗: ${message}` }, { status: 500 });
  }
}
