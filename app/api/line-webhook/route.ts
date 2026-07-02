import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('LINE Webhook received:', JSON.stringify(body));

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 找出群組 ID
    for (const event of body.events || []) {
      const source = event.source;
      if (source?.type === 'group' && source?.groupId) {
        const groupId = source.groupId;
        console.log('Found group ID:', groupId);
        // 存到 Supabase 的 settings 表（等一下建立）
        await supabase.from('dispatch_settings').upsert({
          key: 'line_group_id',
          value: groupId,
        }, { onConflict: 'key' });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ status: 'ok' }); // LINE 需要回 200
  }
}

// LINE Verify 用的 GET
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
