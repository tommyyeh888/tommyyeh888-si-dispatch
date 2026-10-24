import { NextRequest, NextResponse } from 'next/server';
import { generateDispatchPdf } from '@/lib/pdf';
import { uploadDispatchPdf } from '@/lib/drive';
import { sendLineMessage } from '@/lib/line';
import { createClient } from '@supabase/supabase-js';
import type { DispatchFormData } from '@/lib/dispatch';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SHORT_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) as DispatchFormData & {
      shortCode?: string;
      code?: string;
    };

    // 1. 強制要求合法 6 碼短碼，徹底移除「不帶 token 直接 insert」的濫用分支
    const rawCode = (data.shortCode || data.code || '').trim().toUpperCase();
    if (!rawCode || !SHORT_CODE_REGEX.test(rawCode)) {
      return NextResponse.json(
        { error: '缺少有效派工短碼，無法送出派工單' },
        { status: 400 }
      );
    }

    if (!data.date) {
      return NextResponse.json({ error: '請填寫日期' }, { status: 400 });
    }
    if (!data.customerSignature || !data.engineerSignature) {
      return NextResponse.json(
        { error: '工程師簽名與客戶簽名皆為必填' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. 先查詢資料庫確認該短碼存在且狀態為 pending（在產 PDF 與上傳 Drive 前先攔截，防止資源濫用）
    const { data: order, error: fetchError } = await supabase
      .from('dispatch_orders')
      .select('id, short_code, status, customer_name, branch, customer_id')
      .eq('short_code', rawCode)
      .single();

    if (fetchError || !order) {
      return NextResponse.json({ error: '找不到此派工單' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json(
        { error: '此派工單已完成回傳，請勿重複送出' },
        { status: 409 }
      );
    }

    // 3. 以資料庫中的客戶名稱與分店為準，避免前端竄改
    const verifiedCustomerName = order.customer_name || data.customerName;
    const verifiedBranchName = order.branch ?? data.branchName ?? '';

    const pdfPayload: DispatchFormData = {
      ...data,
      customerName: verifiedCustomerName,
      branchName: verifiedBranchName,
    };

    // 4. 產生 PDF 並上傳至 Google Drive
    const pdfBytes = await generateDispatchPdf(pdfPayload);
    const driveResult = await uploadDispatchPdf(pdfBytes, {
      date: data.date,
      branchName: verifiedBranchName,
      customerName: verifiedCustomerName,
    });

    // 5. 原子條件更新：只更新 short_code 相符且 status 仍為 pending 的派工單
    const { data: updatedRows, error: updateError } = await supabase
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
      .eq('short_code', rawCode)
      .eq('status', 'pending')
      .select('short_code');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        { error: '派工單狀態已變更或重複送出，更新失敗' },
        { status: 409 }
      );
    }

    // 6. LINE 群組通知
    const selectedOpts = (data.selectedOptions || []).join('、') || '無';
    const machines = (data.machines || [])
      .filter((m) => m.no)
      .map((m) => m.no)
      .join('、');
    const lineMsg = [
      `${data.date} 派工完工通知 (#${rawCode})`,
      '',
      `客戶：${verifiedCustomerName}${verifiedBranchName ? ` / ${verifiedBranchName}` : ''}`,
      `派工項目：${selectedOpts}`,
      machines ? `機器序號：${machines}` : null,
      '',
      '已完工 ✅',
      '',
      `查看派工單：${driveResult.webViewLink}`,
    ]
      .filter((line) => line !== null)
      .join('\n');

    await sendLineMessage(lineMsg);

    return NextResponse.json({ ok: true, ...driveResult });
  } catch (err) {
    console.error('送出派工單失敗:', err);
    const message = err instanceof Error ? err.message : '未知錯誤';
    return NextResponse.json({ error: `送出失敗: ${message}` }, { status: 500 });
  }
}
